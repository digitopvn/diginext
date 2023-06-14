import chalk from "chalk";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty, isNaN } from "lodash";

import type { AppGitInfo, IApp, ICloudProvider, ICluster, IContainerRegistry } from "@/entities";
import type { InputOptions, SslType } from "@/interfaces";
import { availableSslTypes } from "@/interfaces";
import type { ResourceQuotaSize } from "@/interfaces/SystemTypes";
import { availableResourceSizes } from "@/interfaces/SystemTypes";
import { getCurrentGitRepoData, resolveEnvFilePath } from "@/plugins";
import { isNumeric } from "@/plugins/number";

import { DB } from "../api/DB";
import { getAppConfigFromApp } from "../apps/app-helper";
import { askForProjectAndApp } from "../apps/ask-project-and-app";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { updateAppConfig } from "../apps/update-config";
import { updateAppGitInfo } from "../apps/update-git-config";
import { askForDomain } from "../build";
import { askForRegistry } from "../registry/ask-for-registry";
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

	// ask for project & app information
	let { project, app } = await askForProjectAndApp(options.targetDirectory, options);
	if (options.isDebugging) console.log("askForDeployEnvironmentInfo > app :>> ", app);
	if (options.isDebugging) console.log("askForDeployEnvironmentInfo > project :>> ", project);

	// verify if this app's directory has any git remote integrated
	if (!app.git || !app.git.provider || !app.git.repoSSH || !app.git.repoURL) {
		const gitInfo = await getCurrentGitRepoData(options.targetDirectory);
		if (options.isDebugging) console.log("askForDeployEnvironmentInfo > gitInfo :>> ", gitInfo);

		if (!gitInfo) throw new Error(`This app's directory doesn't have any git remote integrated.`);

		const updateGitInfo: AppGitInfo = { provider: gitInfo.provider, repoSSH: gitInfo.remoteSSH, repoURL: gitInfo.remoteURL };
		if (options.isDebugging) console.log("askForDeployEnvironmentInfo > updateGitInfo :>> ", updateGitInfo);

		app = await updateAppGitInfo(app, updateGitInfo);
		if (options.isDebugging) console.log("askForDeployEnvironmentInfo > app :>> ", app);
	}

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

	let serverAppConfig = getAppConfigFromApp(app);
	if (options.isDebugging) console.log("askForDeployEnvironmentInfo > serverAppConfig :>> ", serverAppConfig);
	if (typeof serverAppConfig.deployEnvironment === "undefined") serverAppConfig.deployEnvironment = {};

	let serverDeployEnvironment = serverAppConfig.deployEnvironment[env] || {};
	const environmentDomains = serverDeployEnvironment.domains || [];
	if (options.isDebugging) console.log("askForDeployEnvironmentInfo > serverDeployEnvironment :>> ", serverDeployEnvironment);
	// TODO: move this part to server side?
	// if (
	// 	serverAppConfig.project !== localAppConfig.project ||
	// 	serverAppConfig.slug !== localAppConfig.slug ||
	// 	serverDeployEnvironment.cluster !== localDeployEnvironment.cluster ||
	// 	serverDeployEnvironment.namespace !== localDeployEnvironment.namespace
	// ) {
	// 	// Call API to terminate previous deployment
	// 	const { buildServerUrl } = getCliConfig();
	// 	const terminateData = { slug: serverAppConfig.slug, env };
	// 	// console.log("terminateData :>> ", terminateData);
	// 	const { status, messages } = await fetchApi({
	// 		url: `${buildServerUrl}/api/v1/app/environment`,
	// 		method: "DELETE",
	// 		data: terminateData,
	// 	});
	// 	if (!status) {
	// 		logWarn(`Can't terminate app's deploy environment:`, messages);
	// 	} else {
	// 		log(`Terminated "${app.slug}" app's "${env}" deploy environment since the app config was changed.`);
	// 	}
	// }

	/**
	 * PARSE LOCAL DEPLOYMENT CONFIG & ASK FOR MISSING INFO
	 */

	// request cluster
	if (!serverDeployEnvironment.cluster) {
		const clusters = await DB.find<ICluster>("cluster", {}, { populate: ["provider"] }, { limit: 20 });
		if (isEmpty(clusters)) {
			logError(`No clusters found in this workspace. Please add one to deploy on.`);
			return;
		}

		const { cluster } = await inquirer.prompt<{ cluster: ICluster }>({
			type: "list",
			name: "cluster",
			message: `Which cluster do you want to use for "${env}" environment?`,
			choices: clusters.map((_cluster) => {
				return { name: _cluster.name, value: _cluster };
			}),
		});
		serverDeployEnvironment.cluster = cluster.shortName;
		serverDeployEnvironment.provider = (cluster.provider as ICloudProvider).shortName;
	} else {
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: serverDeployEnvironment.cluster });
		if (!cluster) {
			logError(`Cluster "${serverDeployEnvironment.cluster}" not found.`);
			return;
		}
	}

	options.cluster = serverDeployEnvironment.cluster;
	options.provider = serverDeployEnvironment.provider;

	// request domains
	// console.log("deployEnvironment.domains :>> ", deployEnvironment.domains);
	if (isEmpty(environmentDomains)) {
		try {
			const domains = await askForDomain(env, project.slug, app.slug, serverDeployEnvironment);
			serverDeployEnvironment.domains = isEmpty(domains) ? [] : domains;
		} catch (e) {
			logError(`[ASK_DEPLOY_INFO] ${e}`);
			return;
		}
	} else {
		// TODO: check for domain DNS ?
	}

	if (isEmpty(serverDeployEnvironment.domains)) {
		logWarn(
			`This app doesn't have any domains configurated & will be reachable within namespace/cluster scope. 
To expose this app to the internet later, you can add your own domain to "dx.json" & deploy it again.`
		);
	}

	// request container registry
	let registry: IContainerRegistry;
	if (serverDeployEnvironment.registry) {
		registry = await DB.findOne("registry", { slug: serverDeployEnvironment.registry });
		if (registry) serverDeployEnvironment.registry = registry.slug;
	}
	if (!serverDeployEnvironment.registry) {
		registry = await askForRegistry();
		serverDeployEnvironment.registry = registry.slug;
	}

	// ALWAYS UPDATE NEW "imageURL"
	// if (!serverDeployEnvironment.imageURL) {
	const imageSlug = `${project.slug}-${app.slug}`;
	serverDeployEnvironment.imageURL = `${registry.imageBaseURL}/${imageSlug}`;
	// }
	options.imageURL = serverDeployEnvironment.imageURL;

	// request ingress class
	// deployEnvironment.ingress;

	// request namespace
	if (!serverDeployEnvironment.namespace) serverDeployEnvironment.namespace = `${project.slug}-${env}`;
	options.namespace = serverDeployEnvironment.namespace;

	// request port
	if (typeof serverDeployEnvironment.port === "undefined" || isNaN(serverDeployEnvironment.port)) {
		const { selectedPort } = await inquirer.prompt<{ selectedPort: number }>({
			type: "number",
			name: "selectedPort",
			message: "Which port do you use for this app?",
			default: 3000,
			validate: (input) => (isNaN(input) ? "Port should be a valid number." : true),
		});
		serverDeployEnvironment.port = options.port = selectedPort;
	}
	options.port = serverDeployEnvironment.port;

	// request inherit previous deployment config
	if (typeof serverDeployEnvironment.shouldInherit === "undefined") serverDeployEnvironment.shouldInherit = true;
	options.shouldInherit = serverDeployEnvironment.shouldInherit;

	// request cdn
	if (typeof serverDeployEnvironment.cdn === "undefined") serverDeployEnvironment.cdn = false;
	options.shouldEnableCDN = serverDeployEnvironment.cdn;

	// request replicas
	if (typeof serverDeployEnvironment.replicas === "undefined") serverDeployEnvironment.replicas = 1;
	if (!isNumeric(serverDeployEnvironment.replicas)) serverDeployEnvironment.replicas = 1;
	options.replicas = serverDeployEnvironment.replicas;

	// request container size
	if (typeof serverDeployEnvironment.size === "undefined") {
		const { selectedSize } = await inquirer.prompt<{ selectedSize: ResourceQuotaSize }>({
			type: "list",
			name: "selectedSize",
			message: "Please select your default container registry:",
			choices: availableResourceSizes.map((r) => {
				return { name: r, value: r };
			}),
		});
		serverDeployEnvironment.size = selectedSize;
	}
	options.size = serverDeployEnvironment.size;

	// request SSL config
	// TODO: Each domain should has its own tls secret
	if (serverDeployEnvironment.domains.length > 0) {
		if (typeof serverDeployEnvironment.ssl === "undefined" || serverDeployEnvironment.ssl === "none") {
			serverDeployEnvironment.ssl = await askForCertIssuer();
		}

		options.ssl = true;
		if (serverDeployEnvironment.ssl === "letsencrypt" || serverDeployEnvironment.ssl === "none") {
			// leave empty so the build server will generate it automatically
			serverDeployEnvironment.tlsSecret = "";
		} else {
			// if they select "custom" SSL certificate -> ask for secret name:
			const { customSecretName } = await inquirer.prompt({
				type: "input",
				name: "customSecretName",
				message: `Name your predefined custom SSL secret (ENTER to use default):`,
				default: serverDeployEnvironment.tlsSecret,
			});
			if (customSecretName) serverDeployEnvironment.tlsSecret = customSecretName;
		}
	} else {
		options.ssl = false;
		serverDeployEnvironment.ssl = "none";
		serverDeployEnvironment.tlsSecret = undefined;
		serverDeployEnvironment.domains = [];
		// TODO: remove domains from database
	}

	/**
	 * UPDATE APP CONFIG ON SERVER:
	 * (save app & its deploy environment data to database)
	 */
	if (options.isDebugging) console.log(">>>>>>>>> askDeployEnvironmentInfo > updateAppConfig()");
	if (options.isDebugging) console.log("askDeployEnvironmentInfo > serverAppConfig :>> ", serverAppConfig);
	if (options.isDebugging) console.log("askDeployEnvironmentInfo > serverDeployEnvironment :>> ", serverDeployEnvironment);

	const appConfig = await updateAppConfig(app, env, serverDeployEnvironment);
	serverDeployEnvironment = appConfig.deployEnvironment[env];

	if (options.isDebugging) log(`[ASK DEPLOY INFO] serverDeployEnvironment :>>`, serverDeployEnvironment);

	// fetched latest app on server
	app = await DB.findOne<IApp>("app", { slug: app.slug }, { populate: ["project", "owner", "workspace"] });
	if (options.isDebugging) log(`[ASK DEPLOY INFO] updated app :>>`, app);

	/**
	 * UPLOAD ENVIRONMENT VARIABLES
	 * ---
	 * Check database to see should sync ENV variables or not...
	 */
	const { envVars: serverEnvironmentVariables = [] } = await getDeployEvironmentByApp(app, env);

	let envFile = resolveEnvFilePath({ targetDirectory: appDirectory, env, ignoreIfNotExisted: true });
	// console.log("envFile :>> ", envFile);
	if (options.isDebugging) console.log("serverEnvironmentVariables :>> ", serverEnvironmentVariables);

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
				default: true,
				message: `Do you want to use your "${envFile}" on ${env.toUpperCase()} environment?`,
			});

			if (shouldUploadEnv) await uploadDotenvFileByApp(envFile, app, env);
		}
	}

	// [SECURITY CHECK] warns if DOTENV files are not listed in ".gitignore" file
	await checkGitignoreContainsDotenvFiles({ targetDir: appDirectory });

	return { project, app, appConfig, deployEnvironment: serverDeployEnvironment };
};
