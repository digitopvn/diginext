import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import fs from "fs";
import yaml from "js-yaml";
import { isEmpty } from "lodash";
import path from "path";
import yargs from "yargs";

import { isServerMode } from "@/app.config";
import { CLI_DIR, HOME_DIR } from "@/config/const";
import type { CloudProvider, Cluster } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { CloudProviderService, ClusterService } from "@/services";

import fetchApi from "../api/fetchApi";
import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

/**
 * Authenticate custom Kubernetes cluster access
 */
export const authenticate = async (options?: InputOptions) => {
	const kubeConfigPath = options.filePath;

	if (!fs.existsSync(kubeConfigPath)) {
		logError(`KUBECONFIG file not found. Try: "di custom auth -f /path/to/your-kube-config.yaml"`);
		return;
	}

	// load new kubeconfig yaml:
	let newKubeConfigContent = fs.readFileSync(kubeConfigPath, "utf8");
	let newKubeConfig = yaml.load(newKubeConfigContent);
	const currentContext = newKubeConfig["current-context"];

	// generate current kubeconfig file:
	const currentKubeConfigFile = path.resolve(CLI_DIR, "keys/kbconf.yaml");
	let currentKubeConfigContent;
	try {
		/** FOR TEST */
		// const { stdout } = await execa.command(`kubectl config --kubeconfig ${currentKubeConfigFile} view --flatten`);
		const { stdout } = await execa.command(`kubectl config view --flatten`);
		currentKubeConfigContent = stdout;
	} catch (e) {
		logError(e);
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
	let createdCluster,
		existed,
		createdData = {
			name: "Custom Cluster",
			shortName: currentContext,
			providerShortName: "custom",
			owner: options.userId,
			workspace: options.workspaceId,
		};

	if (isServerMode) {
		const clusterSvc = new ClusterService();
		existed = await clusterSvc.findOne({ shortName: currentContext });
		createdCluster = existed ? existed : await clusterSvc.create(createdData);
	} else {
		const existedRes = await fetchApi<Cluster>({ url: `/api/v1/cluster?shortName=${currentContext}` });
		if (!isEmpty(existedRes.data)) {
			existed = existedRes.data[0];
		} else {
			const { data } = await fetchApi<Cluster>({
				url: `/api/v1/cluster`,
				method: "POST",
				data: createdData,
			});
			createdCluster = data;
		}
	}
	if (isEmpty(createdCluster)) return;
	const newCluster = createdCluster as Cluster;

	// Save this cloud provider to database
	const cloudProviderData = {
		name: "Custom Provider",
		shortName: "custom",
		clusters: [newCluster._id.toString()],
		owner: options.userId,
		workspace: options.workspaceId,
	};
	if (isServerMode) {
		const providerSvc = new CloudProviderService();
		const providers = await providerSvc.find({ shortName: "custom" });
		if (isEmpty(providers)) {
			await providerSvc.create(cloudProviderData);
		} else {
			// TODO: logWarn(`Multiple "custom" cloud providers are not supported yet.`);
		}
	} else {
		const { data: providers } = await fetchApi<CloudProvider>({ url: `/api/v1/provider?shortName=custom` });
		if (!isEmpty(providers)) {
			// TODO: logWarn(`Multiple "custom" cloud providers are not supported yet.`);
		} else {
			const { status } = await fetchApi<CloudProvider>({
				url: `/api/v1/provider`,
				method: "POST",
				data: cloudProviderData,
			});
			if (!status) logWarn(`Can't create new "custom" cloud provider.`);
		}
	}

	logSuccess(`Authenticated a custom provider: ${currentContext}`);
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
	const { providerShortName } = options;
	const secretName = `${providerShortName}-docker-registry-key`;
	return { name: secretName, value: null };
};

export const execCustomProvider = async (options?: InputOptions) => {
	const { secondAction } = options;

	switch (secondAction) {
		case "auth":
			try {
				await authenticate(options);
			} catch (e) {
				logError(e);
			}
			break;

		case "connect-registry":
			try {
				await connectDockerRegistry(options);
			} catch (e) {
				logError(e);
			}
			break;

		default:
			yargs.showHelp();
			break;
	}
};

export default { authenticate, connectDockerRegistry, createImagePullingSecret };
