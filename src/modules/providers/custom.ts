import { logError, logWarn } from "diginext-utils/dist/xconsole/log";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import yargs from "yargs";

import { HOME_DIR } from "@/config/const";
import type { ICluster } from "@/entities";
import type { KubeConfig } from "@/interfaces";
import type { InputOptions } from "@/interfaces/InputOptions";

import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

/**
 * Authenticate custom Kubernetes cluster access
 */
export const authenticate = async (cluster: ICluster, options?: InputOptions) => {
	const { execaCommand } = await import("execa");

	const kubeConfigPath = options.filePath;

	if (!fs.existsSync(kubeConfigPath)) {
		logError(`KUBECONFIG file not found. Try: "dx custom auth -f /path/to/your-kube-config.yaml"`);
		return;
	}

	// load new kubeconfig yaml:
	let newKubeConfigContent = fs.readFileSync(kubeConfigPath, "utf8");
	let newKubeConfig = yaml.load(newKubeConfigContent) as KubeConfig;

	// make sure it won't be duplicated in KUBE_CONFIG -> generate "context" from "cluster.slug"
	newKubeConfig.clusters = newKubeConfig.clusters.map((_cluster) => {
		_cluster.name = cluster.slug;
		return _cluster;
	});
	newKubeConfig.users = newKubeConfig.users.map((_user) => {
		_user.name = `${cluster.slug}-user`;
		return _user;
	});
	newKubeConfig.contexts = newKubeConfig.contexts.map((_context) => {
		_context.context.cluster = cluster.slug;
		_context.context.user = `${cluster.slug}-user`;
		_context.name = cluster.slug;
		return _context;
	});
	newKubeConfig["current-context"] = cluster.slug;
	newKubeConfigContent = yaml.dump(newKubeConfig);

	// [ONLY] for "custom" cluster -> context name == slug == short name
	const currentContext = newKubeConfig["current-context"];
	if (options.isDebugging) console.log("[CUSTOM CLUSTER] Auth > currentContext :>> ", currentContext);

	// generate current kubeconfig file:
	let currentKubeConfigContent;
	try {
		/** FOR TEST */
		// const currentKubeConfigFile = path.resolve(CLI_DIR, "keys/kbconf.yaml");
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

	// add cluster
	newKubeConfig.clusters.forEach((newItem) => {
		const existedItem = currentKubeConfig.clusters.find((item) => item.name == newItem.name);
		if (!existedItem) currentKubeConfig.clusters.push(newItem);
	});
	// add user
	newKubeConfig.users.forEach((newItem) => {
		const existedItem = currentKubeConfig.users.find((item) => item.name == newItem.name);
		if (!existedItem) currentKubeConfig.users.push(newItem);
	});
	// add context
	newKubeConfig.contexts.forEach((newItem) => {
		const existedItem = currentKubeConfig.contexts.find((item) => item.name == newItem.name);
		if (!existedItem) currentKubeConfig.contexts.push(newItem);
	});

	// currentKubeConfig["current-context"] = newKubeConfig["current-context"];
	// log({ currentKubeConfig });

	const finalKubeConfigContent = yaml.dump(currentKubeConfig);
	// log(finalKubeConfigContent);

	const kubeConfigDir = path.resolve(HOME_DIR, ".kube");
	if (!fs.existsSync(kubeConfigDir)) fs.mkdirSync(kubeConfigDir, { recursive: true });
	fs.writeFileSync(path.resolve(kubeConfigDir, "config"), finalKubeConfigContent, "utf8");

	// if authentication is success -> update cluster as verified:
	const { DB } = await import("@/modules/api/DB");

	cluster = await DB.updateOne(
		"cluster",
		{ _id: cluster._id },
		{ isVerified: true, kubeConfig: newKubeConfigContent, contextName: currentContext, shortName: currentContext }
	);

	return cluster;
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
	const { clusterSlug } = options;
	const secretName = `${clusterSlug}-docker-registry-key`;
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
