import { logError, logWarn } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import { getCliConfig } from "@/config/config";
import type { App, CloudProvider, Cluster, ContainerRegistry } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";

import { getAppConfig, saveAppConfig } from "../../plugins/utils";
import { askForDomain } from "../build/ask-for-domain";
import { requestDeploy } from "../build/request-deploy";

export async function execDeploy(options: InputOptions) {
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	const { targetDirectory, env } = options;

	// check if there is deployment configuration
	const appConfig = getAppConfig(targetDirectory);
	const { currentCluster } = getCliConfig();

	/**
	 * Combined from: `<project-slug>/<app-name-in-slug-case>`
	 */
	const imageSlug = `${appConfig.project}/${makeSlug(appConfig.name)}`;

	let selectedCluster: Cluster,
		domains: string[],
		selectedSSL: "letsencrypt" | "custom" | "none" = "letsencrypt",
		selectedSecretName;

	// Ask for environment options if it's not existed
	if (isEmpty(appConfig.environment[env])) appConfig.environment[env] = {};

	// if input cli has namespace, use it, otherwise namespace = project (slug)
	appConfig.environment[env].namespace = options.namespace ?? appConfig.project + `-${env}`;

	if (isEmpty(appConfig.environment[env].cluster)) {
		// ask if they want to use default cluster (on their local machine):
		if (currentCluster) {
			const { useDefaultCluster } = await inquirer.prompt({
				type: "confirm",
				name: "useDefaultCluster",
				message: `Do you want to use your current cluster "${currentCluster.name}" (${currentCluster.shortName}) for this environment?`,
				default: true,
			});

			if (useDefaultCluster) selectedCluster = currentCluster;
		}

		// if no current cluster or don't want to use default cluster -> select in the list:
		if (!selectedCluster) {
			const { data } = await fetchApi<Cluster>({ url: `/api/v1/cluster?populate=provider&limit=20` });
			const clusters = data as Cluster[];

			const { cluster } = await inquirer.prompt({
				type: "list",
				name: "cluster",
				message: `Which cluster do you want to use for "${env}" environment?`,
				choices: clusters.map((_cluster) => {
					return { name: _cluster.name, value: _cluster };
				}),
			});
			selectedCluster = cluster;
		}
	} else {
		const clusterShortName = appConfig.environment[env].cluster;
		const { data } = await fetchApi<Cluster>({
			url: `/api/v1/cluster?populate=provider&shortName=${clusterShortName}`,
		});

		const clusters = data as Cluster[];
		if (clusters.length == 0) return logError(`The "${clusterShortName}" doesn't seem to be existed.`);

		selectedCluster = clusters[0];
	}

	appConfig.environment[env].provider = (selectedCluster.provider as CloudProvider).shortName;
	appConfig.environment[env].cluster = selectedCluster.shortName;

	// check for container registry:
	if (!appConfig.environment[env].registry) {
		// create "registry" and "imageURL"
		// if (isEmpty(currentRegistry)) {
		const { status, data } = await fetchApi<ContainerRegistry>({ url: `/api/v1/registry?limit=10` });

		if (!status) return logError(`Can't get list of container registry.`);
		const registries = data as ContainerRegistry[];

		const { selectedRegistry } = await inquirer.prompt({
			type: "list",
			name: "selectedRegistry",
			message: "Please select your default container registry:",
			choices: registries.map((r) => {
				return { name: r.slug, value: r };
			}),
		});
		// saveCliConfig({ currentRegistry: selectedRegistry });
		// }
		const registry = selectedRegistry as ContainerRegistry;
		appConfig.environment[env].registry = registry.slug;
		appConfig.environment[env].imageURL = `${registry.imageBaseURL}/${imageSlug}`;
	}

	if (isEmpty(appConfig.environment[env].cdn)) appConfig.environment[env].cdn = false;

	// update deploy config:
	appConfig.environment[env].shouldInherit = options.shouldInherit ?? appConfig.environment[env].shouldInherit ?? true;
	appConfig.environment[env].redirect = options.redirect ?? appConfig.environment[env].redirect ?? false;
	appConfig.environment[env].replicas = options.replicas ?? appConfig.environment[env].replicas ?? 1;
	appConfig.environment[env].zone = options.zone ?? appConfig.environment[env].zone ?? "";
	appConfig.environment[env].size = options.size ?? appConfig.environment[env].size ?? "none";
	appConfig.environment[env].port = options.port ?? appConfig.environment[env].port ?? 3000;

	// for Google Cloud project
	if (options.providerProject) appConfig.environment[env].project = options.providerProject;

	// sync "InputOptions" with "AppConfig":
	options.slug = appConfig.slug;
	options.projectSlug = appConfig.project;
	options.shouldInherit = appConfig.environment[env].shouldInherit;
	options.redirect = appConfig.environment[env].redirect;
	options.replicas = appConfig.environment[env].replicas;
	options.zone = appConfig.environment[env].zone;
	options.size = appConfig.environment[env].size;

	if (!appConfig.environment[env].zone) delete appConfig.environment[env].zone;

	// write the app config down:
	saveAppConfig(appConfig, { directory: targetDirectory });

	// ask for generated domains:
	domains = await askForDomain(options);
	if (domains.length < 1) {
		logWarn(
			`This app doesn't have any domains configurated & only visible to the namespace scope, you can add your own domain to "dx.json" to expose this app to the internet anytime.`
		);
	}
	appConfig.environment[env].domains = domains;

	// if they have any domains, ask if they want to use "letsencrypt":
	if (appConfig.environment[env].domains.length > 0 && !appConfig.environment[env].ssl) {
		const askSSL = await inquirer.prompt({
			type: "list",
			name: "selectedSSL",
			message: `Which SSL certificate do you want to use for these domains?`,
			default: "letsencrypt",
			choices: ["letsencrypt", "custom", "none"],
		});
		selectedSSL = askSSL.selectedSSL;
	}
	selectedSecretName = `tls-secret-${selectedSSL}-${appConfig.project}-${appConfig.slug}`;

	// if they select "custom" SSL certificate -> ask for secret name:
	if (selectedSSL == "custom") {
		const askSecretName = await inquirer.prompt({
			type: "input",
			name: "secretName",
			message: `Name your custom SSL secret (ENTER to use default):`,
			default: selectedSecretName,
		});
		selectedSecretName = askSecretName.secretName;
	}

	appConfig.environment[env].ssl = selectedSSL;
	appConfig.environment[env].tlsSecret = selectedSecretName;

	// save domains & SSL configs
	saveAppConfig(appConfig, { directory: targetDirectory });

	// update this app's environment in database:
	const updatedApp: any = {};
	updatedApp[`environment.${env}`] = JSON.stringify(appConfig.environment[env]);
	updatedApp.lastUpdatedBy = options.username;
	// console.log("updatedApp :>> ", updatedApp);

	const { status, data: app } = await fetchApi<App>({
		url: `/api/v1/app?slug=${appConfig.slug}`,
		method: "PATCH",
		data: updatedApp,
	});

	if (!status) return logError(`Can't update new app config.`);

	// request build server to build & deploy:
	await requestDeploy(options);

	return options;
}
