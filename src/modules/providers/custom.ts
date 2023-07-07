import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import fs from "fs";
import yaml from "js-yaml";
import { isEmpty } from "lodash";
import path from "path";
import yargs from "yargs";

import { CLI_DIR, HOME_DIR } from "@/config/const";
import type { ICluster } from "@/entities";
import type { KubeConfig } from "@/interfaces";
import type { InputOptions } from "@/interfaces/InputOptions";
import { MongoDB } from "@/plugins/mongodb";

import { DB } from "../api/DB";
import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

/**
 * Authenticate custom Kubernetes cluster access
 */
export const authenticate = async (options?: InputOptions) => {
	const { execa, execaCommand, execaSync } = await import("execa");

	const kubeConfigPath = options.filePath;

	if (!fs.existsSync(kubeConfigPath)) {
		logError(`KUBECONFIG file not found. Try: "dx custom auth -f /path/to/your-kube-config.yaml"`);
		return;
	}

	// load new kubeconfig yaml:
	let newKubeConfigContent = fs.readFileSync(kubeConfigPath, "utf8");
	let newKubeConfig = yaml.load(newKubeConfigContent) as KubeConfig;
	const currentContext = newKubeConfig["current-context"];

	// generate current kubeconfig file:
	const currentKubeConfigFile = path.resolve(CLI_DIR, "keys/kbconf.yaml");
	let currentKubeConfigContent;
	try {
		/** FOR TEST */
		// const { stdout } = await execaCommand(`kubectl config --kubeconfig ${currentKubeConfigFile} view --flatten`);
		const { stdout } = await execaCommand(`kubectl config view --flatten`);
		currentKubeConfigContent = stdout;
	} catch (e) {
		logError(`[CUSTOM_PROVIDER_AUTH]`, e);
		return;
	}

	// Only add new value if it's not existed
	let currentKubeConfig = yaml.load(currentKubeConfigContent);
	if (!currentKubeConfig.clusters) currentKubeConfig.clusters = [];
	if (!currentKubeConfig.contexts) currentKubeConfig.contexts = [];
	if (!currentKubeConfig.users) currentKubeConfig.users = [];

	newKubeConfig.clusters.forEach((newItem) => {
		const existedItem = currentKubeConfig.clusters.find((item) => item.name == newItem.name);
		if (!existedItem) currentKubeConfig.clusters.push(newItem);
	});
	newKubeConfig.contexts.forEach((newItem) => {
		const existedItem = currentKubeConfig.contexts.find((item) => item.name == newItem.name);
		if (!existedItem) currentKubeConfig.contexts.push(newItem);
	});
	newKubeConfig.users.forEach((newItem) => {
		const existedItem = currentKubeConfig.users.find((item) => item.name == newItem.name);
		if (!existedItem) currentKubeConfig.users.push(newItem);
	});

	// currentKubeConfig["current-context"] = newKubeConfig["current-context"];
	// log({ currentKubeConfig });

	const finalKubeConfigContent = yaml.dump(currentKubeConfig);
	// log(finalKubeConfigContent);

	// TODO: mount a volume to persist kube configs
	const kubeConfigDir = path.resolve(HOME_DIR, ".kube");
	if (!fs.existsSync(kubeConfigDir)) fs.mkdirSync(kubeConfigDir, { recursive: true });
	fs.writeFileSync(path.resolve(kubeConfigDir, "config"), finalKubeConfigContent, "utf8");

	/** FOR TEST */
	// fs.writeFileSync(currentKubeConfigFile, finalKubeConfigContent, "utf8");

	// Save this cluster to database

	const createdData = {
		name: "Custom Cluster",
		shortName: currentContext,
		providerShortName: "custom",
		owner: options.userId,
		workspace: options.workspaceId,
	};

	const existed = await await DB.findOne("cluster", { shortName: currentContext });
	const createdCluster = existed || (await DB.create("cluster", createdData));

	if (!createdCluster) return;
	const newCluster = createdCluster as ICluster;

	// Save this cloud provider to database
	const cloudProviderData = {
		name: "Custom Provider",
		shortName: "custom",
		clusters: [MongoDB.toString(newCluster._id)],
		owner: options.userId,
		workspace: options.workspaceId,
	};

	const providers = await DB.find("provider", { shortName: "custom" });
	if (isEmpty(providers)) {
		const newProvider = await DB.create("provider", cloudProviderData);
		log({ newProvider });
		if (!newProvider) logWarn(`Can't create new "custom" cloud provider.`);
	}

	logSuccess(`[CLOUD PROVIDER] ✓ Authenticated a custom provider: ${currentContext}`);
	log(`Switched kubectl context to "${currentContext}"`);

	return currentContext;
};

/**
 * Connect Docker to custom Container Registry
 * @param {InputOptions} options
 */
export const connectDockerRegistry = async (options?: InputOptions) => {
	logWarn("This feature is under development.");
	return false;
};

/**
 * Create image pulling secret of custom Container Registry
 */
export const createImagePullingSecret = async (options?: ContainerRegistrySecretOptions) => {
	logWarn(`This feature is under development.`);
	const { clusterShortName } = options;
	const secretName = `${clusterShortName}-docker-registry-key`;
	return { name: secretName, value: null };
};

export const execCustomProvider = async (options?: InputOptions) => {
	const { secondAction } = options;

	switch (secondAction) {
		case "auth":
			try {
				await authenticate(options);
			} catch (e) {
				logError(`[CUSTOM_PROVIDER_AUTH]`, e);
			}
			break;

		case "connect-registry":
			try {
				await connectDockerRegistry(options);
			} catch (e) {
				logError(`[CONNECT_REGISTRY]`, e);
			}
			break;

		default:
			yargs.showHelp();
			break;
	}
};

export default { authenticate, connectDockerRegistry, createImagePullingSecret };
