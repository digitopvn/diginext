import { logError, logWarn } from "diginext-utils/dist/xconsole/log";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import yargs from "yargs";

import { HOME_DIR } from "@/config/const";
import type { ICluster } from "@/entities";
import type { KubeConfig } from "@/interfaces";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { Ownership } from "@/interfaces/SystemTypes";

import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

/**
 * Authenticate custom Kubernetes cluster access
 */
export const authenticate = async (cluster: ICluster, options?: InputOptions & { ownership: Ownership }) => {
	const { execaCommand } = await import("execa");
	const { DB } = await import("@/modules/api/DB");

	const kubeConfigPath = options.filePath;

	if (!fs.existsSync(kubeConfigPath)) {
		throw new Error(`KUBECONFIG file not found. Try: "dx custom auth -f /path/to/your-kube-config.yaml"`);
	}

	// test cluster connection before writing config file
	const clusterConnect = await execaCommand(`kubectl --kubeconfig=${kubeConfigPath} cluster-info`).catch((e) => ({
		stdout: undefined,
		stderr: "Unable to connect",
	}));
	const isConnectable = typeof clusterConnect.stdout !== "undefined" && clusterConnect.stderr.indexOf("Unable to connect") === -1;
	console.log(`[CUSTOM] clusterConnect > ${cluster.slug} :>> Connection status:`, isConnectable);
	if (!isConnectable) {
		await DB.updateOne("cluster", { _id: cluster._id }, { isVerified: false });
		throw new Error(`Unable to connect to "${cluster.slug}" cluster, please double check your kubeconfig.`);
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

	// generate current kubeconfig file:
	let currentKubeConfigContent;
	try {
		/** FOR TEST */
		const { stdout } = await execaCommand(`kubectl config view --flatten`);
		currentKubeConfigContent = stdout;
	} catch (e) {
		logError(`[CUSTOM_PROVIDER_AUTH]`, e);
		return;
	}

	// Only add new value if it's not existed
	let currentKubeConfig = yaml.load(currentKubeConfigContent) as KubeConfig;
	if (!currentKubeConfig.clusters) currentKubeConfig.clusters = [];
	if (!currentKubeConfig.contexts) currentKubeConfig.contexts = [];
	if (!currentKubeConfig.users) currentKubeConfig.users = [];

	// add cluster
	newKubeConfig.clusters.forEach((newItem) => {
		const existedItem = currentKubeConfig.clusters.find((item) => item.name === newItem.name);
		if (!existedItem) {
			currentKubeConfig.clusters.push(newItem);
		} else {
			// compare OLD & NEW values
			if (existedItem.cluster.server !== newItem.cluster.server) existedItem.cluster.server = newItem.cluster.server;
			if (existedItem.cluster["certificate-authority-data"] !== newItem.cluster["certificate-authority-data"])
				existedItem.cluster["certificate-authority-data"] = newItem.cluster["certificate-authority-data"];
		}
	});

	// add user
	newKubeConfig.users.forEach((newItem) => {
		const existedItem = currentKubeConfig.users.find((item) => item.name == newItem.name);
		if (!existedItem) {
			currentKubeConfig.users.push(newItem);
		} else {
			let index = currentKubeConfig.users.findIndex((item) => item.name == newItem.name);
			// compare OLD & NEW values
			if (existedItem.user["client-certificate-data"] !== newItem.user["client-certificate-data"])
				currentKubeConfig.users[index].user["client-certificate-data"] = newItem.user["client-certificate-data"];
			if (existedItem.user["client-key-data"] !== newItem.user["client-key-data"])
				currentKubeConfig.users[index].user["client-key-data"] = newItem.user["client-key-data"];
		}
	});

	// add context
	newKubeConfig.contexts.forEach((newItem) => {
		const existedItem = currentKubeConfig.contexts.find((item) => item.name == newItem.name);
		if (!existedItem) {
			currentKubeConfig.contexts.push(newItem);
		} else {
			if (existedItem.context.cluster !== newItem.context.cluster) existedItem.context.cluster = newItem.context.cluster;
			if (existedItem.context.user !== newItem.context.user) existedItem.context.user = newItem.context.user;
		}
	});

	// console.dir(currentKubeConfig, { depth: 10 });

	// [ONLY] for "custom" cluster -> context name == slug == short name
	const currentContext = newKubeConfig["current-context"];
	if (options.isDebugging) console.log("[CUSTOM CLUSTER] Auth > currentContext :>> ", currentContext);

	// currentKubeConfig["current-context"] = newKubeConfig["current-context"];
	// console.log(`[CLUSTER_AUTH] KUBE_CONFIG :>>`, currentKubeConfig);

	const finalKubeConfigContent = yaml.dump(currentKubeConfig);
	// log(finalKubeConfigContent);
	// console.log(`[CLUSTER_AUTH] KUBE_CONFIG :>>`, finalKubeConfigContent);

	const kubeConfigDir = path.resolve(HOME_DIR, ".kube");
	const kubeConfigFile = path.resolve(kubeConfigDir, "config");
	if (!fs.existsSync(kubeConfigDir)) fs.mkdirSync(kubeConfigDir, { recursive: true });
	fs.writeFileSync(kubeConfigFile, finalKubeConfigContent, "utf8");
	// console.log(`[CLUSTER_AUTH] finalKubeConfigContent :>>`, finalKubeConfigContent);
	// console.log(`[CLUSTER_AUTH] kubeConfigFile :>>`, kubeConfigFile);

	// if authentication is success -> update cluster as verified:
	// console.log("currentContext :>> ", currentContext);

	cluster = await DB.updateOne(
		"cluster",
		{ _id: cluster._id },
		{
			isVerified: true,
			kubeConfig: newKubeConfigContent,
			contextName: currentContext,
			shortName: currentContext,
		},
		{ ownership: options.ownership, isDebugging: options.isDebugging }
	);
	// console.log("cluster :>> ", cluster);
	if (!cluster) throw new Error(`Unable to update context to cluster: "${cluster.slug}"`);

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
