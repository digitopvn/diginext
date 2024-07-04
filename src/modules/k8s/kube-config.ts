import { existsSync, writeFileSync } from "fs";
import yaml from "js-yaml";

import { KUBECONFIG_FILE } from "@/config/const";
import type { ICluster } from "@/entities";
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
 * Get KUBE_CONTEXT by {Cluster} instance
 * @param cluster - A cluster
 * @param filePath - [optional] - A ".kubeconfig" YAML file path
 * @returns
 */
export async function getKubeContextByCluster(cluster: ICluster, filePath?: string) {
	const { slug, providerShortName: provider, shortName } = cluster;

	const kubeConfig = await getKubeConfig(filePath);
	if (!kubeConfig) throw new Error(`Can't get Kubernetes context of "${slug}" cluster (${provider}) due to empty KUBE_CONFIG.`);

	const listContexts = kubeConfig.contexts || [];

	let context: KubeConfigContext;
	let contexts: KubeConfigContext[];

	if (provider === "digitalocean") {
		contexts = listContexts.filter((ctx) => ctx.name.startsWith("do-"));
		context = contexts.find((ctx) => ctx.name.indexOf(shortName) > -1);
	} else if (provider === "gcloud") {
		contexts = listContexts.filter((ctx) => ctx.name.startsWith("gke_"));
		context = contexts.find((ctx) => ctx.name.indexOf(shortName) > -1);
	} else {
		context = listContexts.find((ctx) => ctx.name === slug);
	}

	if (!context) {
		// logWarn(`Kubernetes context not found of "${slug}" cluster (${provider}), current contexts: ${listContexts.map((ctx) => ctx.name)}.`);
		throw new Error(`Kubernetes context "${shortName}" not found of "${slug}" cluster (${provider}).`);
	}

	return context;
}

/**
 * Get KUBE_CONTEXT by cluster's short name & cloud provider's short name
 * @param slug - A cluster slug on the cloud provider (**NOT** a cluster in `kubeconfig`)
 * @param provider - A cloud provider short name. One of "digitalocean", "gcloud" or "custom"
 * @param filePath - [optional] - A service account file path
 * @returns
 */
export async function getKubeContextByClusterSlug(slug: string, provider: string, filePath?: string) {
	const { DB } = await import("@/modules/api/DB");
	const cluster = await DB.findOne("cluster", { slug });

	return getKubeContextByCluster(cluster);
}

export async function deleteClusterInKubeConfig(cluster: ICluster, filePath?: string) {
	const { slug, providerShortName: provider, shortName } = cluster;

	const kubeConfig = await getKubeConfig(filePath);
	if (!kubeConfig) throw new Error(`Can't get Kubernetes context of "${slug}" cluster (${provider}) due to empty KUBE_CONFIG.`);

	// delete cluster access credentials in KUBE_CONFIG file
	kubeConfig.clusters = kubeConfig.clusters.filter((_cluster) => _cluster.name !== cluster.contextName);
	kubeConfig.users = kubeConfig.users.filter(
		(_user) =>
			(cluster.providerShortName === "custom" && _user.name !== `${cluster.slug}-user`) ||
			(cluster.providerShortName === "digitalocean" && _user.name !== `${cluster.contextName}-admin`) ||
			(cluster.providerShortName === "gcloud" && _user.name !== cluster.contextName)
	);
	kubeConfig.contexts = kubeConfig.contexts.filter((ctx) => ctx.name !== cluster.contextName);
	if (kubeConfig["current-context"] === cluster.contextName) kubeConfig["current-context"] = "";

	// save to "~/.kube/config"

	const finalKubeConfigContent = yaml.dump(kubeConfig);
	// log(finalKubeConfigContent);
	writeFileSync(KUBECONFIG_FILE, finalKubeConfigContent, "utf8");

	return kubeConfig;
}
