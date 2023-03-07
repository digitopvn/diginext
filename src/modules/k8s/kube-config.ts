import { existsSync } from "fs";
import yaml from "js-yaml";

import type { Cluster } from "@/entities";
import type { KubeConfig, KubeConfigContext } from "@/interfaces";
import { execCmd } from "@/plugins";

export async function getKubeConfig(filePath?: string) {
	let currentKubeConfigContent;

	if (filePath) {
		if (!existsSync(filePath)) {
			throw new Error(`File "${filePath}" not found.`);
		}
		currentKubeConfigContent = await execCmd(`kubectl config --kubeconfig ${filePath} view --flatten`);
	} else {
		currentKubeConfigContent = await execCmd(`kubectl config view --flatten`, `Can't get current "kubeconfig"`);
	}

	if (!currentKubeConfigContent) return;

	const currentKubeConfig = yaml.load(currentKubeConfigContent);

	return currentKubeConfig as KubeConfig;
}

/**
 * Get current context of KUBE_CONFIG
 */
export async function currentContext() {
	const kubeConfig = await getKubeConfig();
	return kubeConfig["current-context"];
}

/**
 * Get current cluster of KUBE_CONFIG
 */
export async function currentCluster() {
	const kubeConfig = await getKubeConfig();
	const curContextName = kubeConfig["current-context"];
	return kubeConfig.contexts.find((ctx) => ctx.name === curContextName);
}

/**
 * Get all available Kubernetes contexts of the build server
 */
export const getAllContexts = async (filePath?: string) => {
	const currentKubeConfig = await getKubeConfig(filePath);
	return currentKubeConfig.contexts;
};

/**
 * Get KUBE_CONTEXT by cluster's short name & cloud provider's short name
 * @param shortName - A cluster name on the cloud provider (**NOT** a cluster in `kubeconfig`)
 * @param provider - A cloud provider short name. One of "digitalocean", "gcloud" or "custom"
 * @param filePath - [optional] - A service account file path
 * @returns
 */
export async function getKubeContextByClusterShortName(shortName: string, provider: string, filePath?: string) {
	const kubeConfig = await getKubeConfig(filePath);
	if (!kubeConfig) throw new Error(`Can't get Kubernetes context of "${shortName}" cluster (${provider}) due to empty KUBE_CONFIG.`);

	const listContexts = kubeConfig.contexts || [];

	let context: KubeConfigContext;
	let providerContexts: KubeConfigContext[];

	if (provider === "digitalocean") {
		providerContexts = listContexts.filter((ctx) => ctx.name.substring(0, 3) === "do-");
		context = providerContexts.find((ctx) => ctx.name.split("-").slice(2).join("-").indexOf(shortName) > -1);
	} else if (provider === "gcloud") {
		providerContexts = listContexts.filter((ctx) => ctx.name.substring(0, 4) === "gke_");
		context = providerContexts.find((ctx) => ctx.name.split("_").slice(3).join("").indexOf(shortName) > -1);
	} else {
		providerContexts = listContexts.filter((ctx) => ctx.name.substring(0, 4) !== "gke_" && ctx.name.substring(0, 3) !== "do-");
		context = providerContexts.find((ctx) => ctx.name.indexOf(shortName) > -1);
	}

	if (!context)
		throw new Error(
			`Kubernetes context not found of "${shortName}" cluster (${provider}), current contexts: ${listContexts.map((ctx) => ctx.name)}.`
		);

	return context;
}

/**
 * Get KUBE_CONTEXT by {Cluster} instance
 * @param cluster - A cluster
 * @param filePath - [optional] - A ".kubeconfig" YAML file path
 * @returns
 */
export async function getKubeContextByCluster(cluster: Cluster, filePath?: string) {
	const { shortName, providerShortName: provider } = cluster;

	const context = await getKubeContextByClusterShortName(shortName, provider, filePath);

	return context;
}
