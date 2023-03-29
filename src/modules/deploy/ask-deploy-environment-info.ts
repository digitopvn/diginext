import chalk from "chalk";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import inquirer from "inquirer";
import { isEmpty, isNaN } from "lodash";

import { getCliConfig } from "@/config/config";
import type { App, CloudProvider, Cluster, ContainerRegistry, Project } from "@/entities";
import type { InputOptions, SslType } from "@/interfaces";
import { availableSslTypes } from "@/interfaces";
import { getAppConfig, resolveEnvFilePath, saveAppConfig } from "@/plugins";
import { isNumeric } from "@/plugins/number";

import { fetchApi } from "../api";
import { DB } from "../api/DB";
import { getAppConfigFromApp } from "../apps/app-helper";
import { createOrSelectApp } from "../apps/create-or-select-app";
import { createOrSelectProject } from "../apps/create-or-select-project";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { askForDomain } from "../build";
import { checkGitignoreContainsDotenvFiles } from "./dotenv-exec";
import { uploadDotenvFileByApp } from "./dotenv-upload";

type DeployEnvironmentRequestOptions = {
	imageURL?: string;
} & InputOptions;

/**
 * Prompt a question to ask for Cert Issuer: Let's Encrypt, Custom Issuer or None
 * @param options
 * @returns
 */
export const askForCertIssuer = async (options: { question?: string; defaultValue?: string } = {}) => {
	const { question, defaultValue } = options;
	const { selectedSSL } = await inquirer.prompt<{ selectedSSL: SslType }>({
		type: "list",
		name: "selectedSSL",
		message: question ?? `Which SSL certificate do you want to use for these domains?`,
		default: defaultValue ?? availableSslTypes[0],
		choices: availableSslTypes,
	});

	return selectedSSL;
};

export const askForDeployEnvironmentInfo = async (options: DeployEnvironmentRequestOptions) => {
	const { env, targetDirectory: appDirectory = process.cwd() } = options;

	/**
	 * --------------------------------------------------
	 * VALIDATE & SAVE CONFIG TO LOCAL APP CONFIG (AGAIN)
	 * --------------------------------------------------
	 * (We need to validate "project" & "app" again here because this method is also used
	 * by REQUEST DEPLOY IMAGE URL, which don't have "dx.json" app configuration)
	 */

	let localAppConfig = getAppConfig(appDirectory);
	const localDeployEnvironment = localAppConfig.environment[env] || {};
	const localDeployDomains = localDeployEnvironment.domains || [];

	let project = localAppConfig.project ? await DB.findOne<Project>("project", { slug: localAppConfig.project }) : undefined;
	if (!project) project = await createOrSelectProject(options);
	localAppConfig.project = project.slug;

	// console.log("askForDeployEnvironmentInfo > project :>> ", project);

	let app = localAppConfig.slug
		? await DB.findOne<App>("app", { slug: localAppConfig.slug }, { populate: ["project", "owner", "workspace"] })
		: undefined;
	if (!app) app = await createOrSelectApp(project.slug, options);
	// console.log("askForDeployEnvironmentInfo > app :>> ", app);
	localAppConfig.slug = app.slug;

	// TODO: validate owner, workspace, git & framework ?

	/**
	 * -----------------------------------------------------------------------
	 * FETCH SERVER APP DEPLOYMENT CONFIG & COMPARE WITH THE LOCAL APP CONFIG
	 * -----------------------------------------------------------------------
	 * If one of these condition matched, terminate the previous deployment & deploy a new one:
	 * - "project" is different
	 * - "app" is different
	 * - "cluster" is different
	 * - "namespace" is different
	 */

	const serverAppConfig = getAppConfigFromApp(app);
	if (typeof serverAppConfig.environment === "undefined") serverAppConfig.environment = {};
	const serverDeployEnvironment = serverAppConfig.environment[env] || {};

	if (
		serverAppConfig.project !== localAppConfig.project ||
		serverAppConfig.slug !== localAppConfig.slug ||
		serverDeployEnvironment.cluster !== localDeployEnvironment.cluster ||
		serverDeployEnvironment.namespace !== localDeployEnvironment.namespace
	) {
		// Call API to terminate previous deployment
		const { buildServerUrl } = getCliConfig();
		const terminateData = { slug: serverAppConfig.slug, env };
		console.log("terminateData :>> ", terminateData);
		const { status, messages } = await fetchApi({
			url: `${buildServerUrl}/api/v1/app/environment`,
			method: "DELETE",
			data: terminateData,
		});
		if (!status) {
			logWarn(`Can't terminate app's deploy environment:`, messages);
		} else {
			log(`Terminated "${app.slug}" app's "${env}" deploy environment since the app config was changed.`);
		}
	}

	/**
	 * PARSE LOCAL DEPLOYMENT CONFIG & ASK FOR MISSING INFO
	 */

	// request cluster
	if (!localDeployEnvironment.cluster) {
		const clusters = await DB.find<Cluster>("cluster", {}, { populate: ["provider"] }, { limit: 20 });
		if (isEmpty(clusters)) {
			logError(`No clusters found in this workspace. Please add one to deploy on.`);
			return;
		}

		const { cluster } = await inquirer.prompt<{ cluster: Cluster }>({
			type: "list",
			name: "cluster",
			message: `Which cluster do you want to use for "${env}" environment?`,
			choices: clusters.map((_cluster) => {
				return { name: _cluster.name, value: _cluster };
			}),
		});
		localDeployEnvironment.cluster = cluster.shortName;
		localDeployEnvironment.provider = (cluster.provider as CloudProvider).shortName;
	}
	localAppConfig.environment[env].cluster = localDeployEnvironment.cluster;
	localAppConfig.environment[env].provider = localDeployEnvironment.provider;
	options.cluster = localDeployEnvironment.cluster;
	options.provider = localDeployEnvironment.provider;

	// request domains
	// console.log("deployEnvironment.domains :>> ", deployEnvironment.domains);
	if (isEmpty(localDeployDomains)) {
		try {
			const domains = await askForDomain(env, project.slug, app.slug, localDeployEnvironment);
			localDeployEnvironment.domains = isEmpty(domains) ? [] : domains;
		} catch (e) {
			logError(`[ASK_DEPLOY_INFO] ${e}`);
			return;
		}
	} else {
		// TODO: check for domain DNS ?
	}
	localAppConfig.environment[env].domains = localDeployEnvironment.domains;

	if (isEmpty(localDeployEnvironment.domains)) {
		logWarn(
			`This app doesn't have any domains configurated & will be reachable within namespace/cluster scope. 
To expose this app to the internet later, you can add your own domain to "dx.json" & deploy it again.`
		);
	}

	// request container registry
	let registry: ContainerRegistry;
	if (localDeployEnvironment.registry) {
		registry = await DB.findOne("registry", { slug: localDeployEnvironment.registry });
		if (registry) localDeployEnvironment.registry = registry.slug;
	}
	if (!localDeployEnvironment.registry) {
		const registries = await DB.find<ContainerRegistry>("registry", {}, {}, { limit: 20 });

		const { selectedRegistry } = await inquirer.prompt<{ selectedRegistry: ContainerRegistry }>({
			type: "list",
			name: "selectedRegistry",
			message: "Please select your default container registry:",
			choices: registries.map((r) => {
				return { name: r.slug, value: r };
			}),
		});

		registry = selectedRegistry;
		localDeployEnvironment.registry = selectedRegistry.slug;
	}
	localAppConfig.environment[env].registry = localDeployEnvironment.registry;

	// request imageURL
	if (!localDeployEnvironment.imageURL) {
		const imageSlug = `${project.slug}/${app.slug}`;
		localDeployEnvironment.imageURL = `${registry.imageBaseURL}/${imageSlug}`;
	}
	options.imageURL = localDeployEnvironment.imageURL;
	localAppConfig.environment[env].imageURL = localDeployEnvironment.imageURL;

	// request ingress class
	// deployEnvironment.ingress;

	// request namespace
	if (!localDeployEnvironment.namespace) localDeployEnvironment.namespace = `${project.slug}-${env}`;
	localAppConfig.environment[env].namespace = localDeployEnvironment.namespace;
	options.namespace = localDeployEnvironment.namespace;

	// request port
	if (typeof localDeployEnvironment.port === "undefined" || isNaN(localDeployEnvironment.port)) {
		const { selectedPort } = await inquirer.prompt<{ selectedPort: number }>({
			type: "number",
			name: "selectedPort",
			message: "Which port do you use for this app?",
			default: 3000,
			validate: (input) => (isNaN(input) ? "Port should be a valid number." : true),
		});
		localDeployEnvironment.port = options.port = selectedPort;
	}
	options.port = localDeployEnvironment.port;
	localAppConfig.environment[env].port = localDeployEnvironment.port;

	// request inherit previous deployment config
	if (typeof localDeployEnvironment.shouldInherit === "undefined") localDeployEnvironment.shouldInherit = true;
	options.shouldInherit = localDeployEnvironment.shouldInherit;
	localAppConfig.environment[env].shouldInherit = localDeployEnvironment.shouldInherit;

	// request cdn
	if (typeof localDeployEnvironment.cdn === "undefined") localDeployEnvironment.cdn = false;
	options.shouldEnableCDN = localDeployEnvironment.cdn;
	localAppConfig.environment[env].cdn = localDeployEnvironment.cdn;

	// request replicas
	if (typeof localDeployEnvironment.replicas === "undefined") localDeployEnvironment.replicas = 1;
	if (!isNumeric(localDeployEnvironment.replicas)) localDeployEnvironment.replicas = 1;
	options.replicas = localDeployEnvironment.replicas;
	localAppConfig.environment[env].replicas = localDeployEnvironment.replicas;

	// request SSL config
	if (localDeployEnvironment.domains.length > 0) {
		const primaryDomain = localDeployEnvironment.domains[0];
		if (typeof localDeployEnvironment.ssl === "undefined" || localDeployEnvironment.ssl === "none") {
			localDeployEnvironment.ssl = await askForCertIssuer();
		}

		options.ssl = true;
		localDeployEnvironment.tlsSecret = `tls-secret-${localDeployEnvironment.ssl}-${makeSlug(primaryDomain)}`;

		// if they select "custom" SSL certificate -> ask for secret name:
		if (localDeployEnvironment.ssl === "custom") {
			const { customSecretName } = await inquirer.prompt({
				type: "input",
				name: "customSecretName",
				message: `Name your predefined custom SSL secret (ENTER to use default):`,
				default: localDeployEnvironment.tlsSecret,
			});
			if (customSecretName) localDeployEnvironment.tlsSecret = customSecretName;
		}
	} else {
		options.ssl = false;
		localDeployEnvironment.ssl = "none";
		localDeployEnvironment.tlsSecret = undefined;
		localDeployEnvironment.domains = [];
		// TODO: remove domains from database
	}
	localAppConfig.environment[env].ssl = localDeployEnvironment.ssl;
	localAppConfig.environment[env].tlsSecret = localDeployEnvironment.tlsSecret;

	// environment variables
	// check database to see should sync ENV variables or not...
	const { envVars: serverEnvironmentVariables = [] } = await getDeployEvironmentByApp(app, env);

	let envFile = resolveEnvFilePath({ targetDirectory: appDirectory, env, ignoreIfNotExisted: true });

	// if "--upload-env" flag is specified:
	if (options.shouldUploadDotenv) {
		if (!envFile) {
			logWarn(`Can't upload DOTENV since there are no DOTENV files (.env.*) in this directory`);
		} else {
			await uploadDotenvFileByApp(envFile, app, env);
		}
	} else {
		// if ENV file is existed on local & not available on server -> ask to upload local ENV to server:
		if (envFile && !isEmpty(serverEnvironmentVariables)) {
			logWarn(`Skip uploading local ENV variables to deployed environment since it's already existed.`);
			log(`(If you want to force upload local ENV variables, deploy again with: ${chalk.cyan("dx deploy --upload-env")})`);
		}

		if (envFile && isEmpty(serverEnvironmentVariables)) {
			const { shouldUploadEnv } = await inquirer.prompt({
				type: "confirm",
				name: "shouldUploadEnv",
				default: false,
				message: `Do you want to use your "${envFile}" on ${env.toUpperCase()} environment?`,
			});

			if (shouldUploadEnv) await uploadDotenvFileByApp(envFile, app, env);
		}
	}

	// [SECURITY CHECK] warns if DOTENV files are not listed in ".gitignore" file
	await checkGitignoreContainsDotenvFiles({ targetDir: appDirectory });

	const appConfig = saveAppConfig(localAppConfig, { directory: appDirectory });
	if (options.isDebugging) log(`[ASK DEPLOY INFO] appConfig :>>`, appConfig);

	const deployEnvironment = appConfig.environment[env];
	/**
	 * PUSH LOCAL APP CONFIG TO SERVER:
	 * (save app & its deploy environment data to database)
	 */
	const updateAppData = {
		slug: appConfig.slug, // <-- update old app slug -> new app slug (if any)
		projectSlug: appConfig.project, // <-- update old app projectSlug -> new app projectSlug (if any)
		project: project._id, // <-- update old app's project -> new app's project (if any)
		deployEnvironment: {
			[env]: deployEnvironment, // <-- update new app's deploy environment
		},
	};
	if (options.isDebugging) log(`[ASK DEPLOY INFO] updateAppData :>>`, updateAppData);

	const [updatedApp] = await DB.update<App>("app", { slug: appConfig.slug }, updateAppData);

	if (options.isDebugging) log(`[ASK DEPLOY INFO] updatedApp :>>`, updatedApp);

	return { project, app, appConfig, deployEnvironment };
};
