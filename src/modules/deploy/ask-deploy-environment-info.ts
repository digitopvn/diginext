import { logError, logWarn } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { App, CloudProvider, Cluster, ContainerRegistry, Project } from "@/entities";
import type { InputOptions, SslType } from "@/interfaces";

import { DB } from "../api/DB";
import { getAppConfigFromApp } from "../apps/app-helper";
import { createOrSelectApp } from "../apps/create-or-select-app";
import { createOrSelectProject } from "../apps/create-or-select-project";
import { askForDomain } from "../build";

type DeployEnvironmentRequestOptions = {
	imageURL?: string;
} & InputOptions;

export const askForDeployEnvironmentInfo = async (options: DeployEnvironmentRequestOptions) => {
	const { isDebugging, imageURL, env, projectSlug, slug, targetDirectory: appDirectory = process.cwd() } = options;

	let project = projectSlug ? await DB.findOne<Project>("project", { slug: projectSlug }) : undefined;
	if (!project) {
		project = await createOrSelectProject(options);
		// update deploy environment in app config (if any)
	}
	// log(`Selected project: "${project.name}"`);

	let app = slug ? await DB.findOne<App>("app", { slug }, { populate: ["project"] }) : undefined;
	if (!app) {
		app = await createOrSelectApp(project.slug, options);
		// update deploy environment in app config (if any)
	}

	/**
	 * Fetch app deploy environment & generate new deploy environment:
	 */
	const appConfig = getAppConfigFromApp(app);
	const deployEnvironment = appConfig.environment[env] || {};

	appConfig.project = project.slug;
	appConfig.slug = app.slug;

	// request cluster
	if (options.cluster) deployEnvironment.cluster = options.cluster;
	if (!deployEnvironment.cluster) {
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
		deployEnvironment.cluster = options.cluster = cluster.shortName;
		deployEnvironment.provider = options.provider = (cluster.provider as CloudProvider).shortName;
	}

	// [GCLOUD] request projectID, region, zone
	if (options.providerProject) deployEnvironment.project = options.providerProject;
	if (options.region) deployEnvironment.region = options.region;
	if (options.zone) deployEnvironment.zone = options.zone;

	// request domains
	if (isEmpty(deployEnvironment.domains)) {
		try {
			deployEnvironment.domains = await askForDomain(env, project.slug, app.slug, deployEnvironment);
		} catch (e) {
			logWarn(e);
			deployEnvironment.domains = [];
		}
	} else {
		// TODO: check for domain DNS ?
	}

	if (deployEnvironment.domains.length < 1) {
		logWarn(
			`This app doesn't have any domains configurated & only reachable within namespace scope. 
To expose this app to the internet later, you can add your own domain to "dx.json" & deploy again.`
		);
	}

	// request container registry
	let registry: ContainerRegistry;
	if (!deployEnvironment.registry) {
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
		deployEnvironment.registry = selectedRegistry.slug;
	}

	// request imageURL
	deployEnvironment.imageURL = imageURL;
	if (!deployEnvironment.imageURL) {
		const imageSlug = `${project.slug}/${app.slug}`;
		deployEnvironment.imageURL = `${registry.imageBaseURL}/${imageSlug}`;
	}

	// request ingress class
	// deployEnvironment.ingress;

	// request namespace
	if (options.namespace) deployEnvironment.namespace = options.namespace;
	if (!deployEnvironment.namespace) deployEnvironment.namespace = `${project.slug}-${env}`;

	// request port
	if (options.port) deployEnvironment.port = options.port;
	if (!deployEnvironment.port) {
		const { selectedPort } = await inquirer.prompt<{ selectedPort: number }>({
			type: "number",
			name: "selectedPort",
			message: "Which port do you use for this app?",
			default: 3000,
		});
		deployEnvironment.port = options.port = selectedPort;
	}

	// request inherit previous deployment config
	if (options.shouldInherit) deployEnvironment.shouldInherit = options.shouldInherit;
	if (typeof deployEnvironment.shouldInherit === "undefined") deployEnvironment.shouldInherit = true;

	// request cdn
	if (options.shouldEnableCDN) deployEnvironment.cdn = options.shouldEnableCDN;
	if (!deployEnvironment.cdn) deployEnvironment.cdn = false;

	// request replicas
	if (options.replicas) deployEnvironment.replicas = options.replicas;
	if (typeof deployEnvironment.replicas === "undefined") deployEnvironment.replicas = 1;

	// request SSL config
	if (deployEnvironment.domains.length > 0) {
		const { selectedSSL } = await inquirer.prompt<{ selectedSSL: SslType }>({
			type: "list",
			name: "selectedSSL",
			message: `Which SSL certificate do you want to use for these domains?`,
			default: "letsencrypt",
			choices: ["letsencrypt", "custom", "none"],
		});
		const primaryDomain = deployEnvironment.domains[0];
		deployEnvironment.ssl = selectedSSL;
		deployEnvironment.tlsSecret = `tls-secret-${deployEnvironment.ssl}-${makeSlug(primaryDomain)}`;

		// if they select "custom" SSL certificate -> ask for secret name:
		if (deployEnvironment.ssl === "custom") {
			const { customSecretName } = await inquirer.prompt({
				type: "input",
				name: "customSecretName",
				message: `Name your predefined custom SSL secret (ENTER to use default):`,
				default: deployEnvironment.tlsSecret,
			});
			if (customSecretName) deployEnvironment.tlsSecret = customSecretName;
		}
	} else {
		deployEnvironment.ssl = "none";
		deployEnvironment.tlsSecret = undefined;
		deployEnvironment.domains = [];
		// TODO: remove domains from database
	}

	appConfig.project = project.slug;
	appConfig.slug = app.slug;
	appConfig.environment[env] = deployEnvironment;

	return { project, app, appConfig, deployEnvironment };
};
