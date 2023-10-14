import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import { unlink } from "fs";

import type { ICluster } from "@/entities";
import type { KubeConfigContext } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import { createTmpFile, execCmd } from "@/plugins";

import custom from "../providers/custom";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import { getKubeContextByCluster, getKubeContextByClusterSlug } from "./kube-config";

export interface ClusterAuthOptions {
	ownership: Ownership;
	/**
	 * Flag to switch to this cluster after finishing authentication
	 * @default true
	 */
	shouldSwitchContextToThisCluster?: boolean;
	/**
	 * Debugging flag
	 * @default false
	 */
	isDebugging?: boolean;
}

export const switchContext = async (context: string) => {
	const result = await execCmd(`kubectl config use-context ${context}`, `[CLUSTER AUTH] Cannot switch current kube context to "${context}"`);
	return typeof result !== "undefined";
};

export const switchContextToCluster = async (clusterSlug: string, providerShortName?: string) => {
	const { DB } = await import("@/modules/api/DB");
	let context: string;
	if (providerShortName) {
		const ctx = await getKubeContextByClusterSlug(clusterSlug, providerShortName);
		context = ctx.name;
	} else {
		const cluster = await DB.findOne("cluster", { slug: clusterSlug });
		if (!cluster) {
			logError(`Can't switch to cluster "${clusterSlug}".`);
			return;
		}
		context = cluster.contextName;
		if (!context && cluster.providerShortName) {
			const ctx = await getKubeContextByClusterSlug(clusterSlug, cluster.providerShortName);
			context = ctx.name;
		}
	}

	if (!context) {
		logError(`[CLUSTER AUTH] Cannot switch current kube context to "${clusterSlug}"`);
		return;
	}

	const result = await execCmd(`kubectl config use-context ${context}`, `[CLUSTER AUTH] Cannot switch current kube context to "${clusterSlug}"`);

	return typeof result !== "undefined";
};

/**
 * Authenticate current machine with the K8S cluster by its short name (context-name).
 */
export const authCluster = async (cluster: ICluster, options: ClusterAuthOptions) => {
	const { DB } = await import("@/modules/api/DB");
	let filePath: string;

	const { providerShortName, slug: clusterSlug } = cluster;
	if (options?.isDebugging) console.log("[AUTH CLUSTER] cluster :>> ", cluster);

	if (!clusterSlug) throw new Error(`Param "slug" (cluster's slug) is required.`);
	if (!providerShortName) throw new Error(`Param "provider" (Cloud Provider's short name) is required.`);

	const { shouldSwitchContextToThisCluster = true } = options;

	let context: KubeConfigContext;

	// Check if Kubernetes context of the cluster is existed in KUBE_CONFIG -> skip cluster authentication
	// context = await getKubeContextByCluster(cluster);
	// if (context && cluster.isVerified) {
	// 	if (shouldSwitchContextToThisCluster) await switchContext(context.name);
	// 	logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterSlug}" cluster.`);
	// 	return cluster;
	// }
	// const { isVerified } = cluster;

	switch (providerShortName) {
		case "gcloud":
			// Only support Google Service Account authentication
			const { serviceAccount } = cluster;
			if (cluster.isVerified && !serviceAccount) throw new Error(`Permissions denied, please contact your administrator.`);
			if (!serviceAccount) throw new Error(`This cluster doesn't have any Google Service Account to authenticate.`);

			// validate service account file:
			const saConfig = JSON.parse(serviceAccount);
			if (!saConfig.project_id) throw new Error(`Invalid Google service account.`);
			const projectID = saConfig.project_id as string;

			// start authenticating...
			filePath = createTmpFile(`gsa.json`, serviceAccount);
			const gcloudAuth = await gcloud.authenticate({ filePath });
			if (!gcloudAuth) throw new Error(`[UNKNOWN] Cannot authenticate the Google Cloud provider.`);

			// delete temporary service account
			unlink(filePath, (err) => err && logError(`[CLUSTER AUTH] Remove tmp file:`, err));

			// save this cluster to KUBE_CONFIG
			if (!cluster.zone) throw new Error(`ZONE is required for Google Cloud Cluster authentication.`);
			await execCmd(`gcloud container clusters get-credentials ${cluster.shortName} --zone=${cluster.zone} --project=${projectID}`);

			// get K8S context
			context = await getKubeContextByCluster(cluster);

			if (context) {
				cluster = await DB.updateOne("cluster", { slug: clusterSlug }, { contextName: context.name }, { ownership: options.ownership });
			} else {
				throw new Error(`Context of "${clusterSlug}" cluster not found.`);
			}

			// switch context (if needed)
			if (shouldSwitchContextToThisCluster) await switchContext(context.name);

			// mark this cluster verified
			cluster = await DB.updateOne("cluster", { slug: clusterSlug }, { isVerified: true }, { ownership: options.ownership });

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterSlug}" cluster.`);

			return cluster;

		case "digitalocean":
			// Only support Digital Ocean API access token authentication
			const { apiAccessToken } = cluster;
			if (cluster.isVerified && !apiAccessToken) throw new Error(`Permissions denied, please contact your administrator.`);
			if (!apiAccessToken) {
				throw new Error(`This cluster doesn't have any Digital Ocean API access token to authenticate.`);
			}

			const doAuth = await digitalocean.authenticate({ key: apiAccessToken });
			if (!doAuth) throw new Error(`[UNKNOWN] Cannot authenticate the Digital Ocean provider.`);

			// save cluster access info to "kubeconfig"
			await execCmd(`doctl kubernetes cluster kubeconfig save ${cluster.shortName}`);

			// get K8S context
			context = await getKubeContextByCluster(cluster);

			if (context) {
				cluster = await DB.updateOne("cluster", { slug: clusterSlug }, { contextName: context.name }, { ownership: options.ownership });
			} else {
				throw new Error(`Context of "${clusterSlug}" cluster not found.`);
			}

			// switch context (if needed)
			if (shouldSwitchContextToThisCluster) await switchContext(context.name);

			// mark this cluster verified
			cluster = await DB.updateOne("cluster", { slug: clusterSlug }, { isVerified: true });

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterSlug}" cluster.`);

			return cluster;

		case "custom":
			// Only support "kube-config" authentication
			const { kubeConfig } = cluster;
			if (cluster.isVerified && !kubeConfig) throw new Error(`Permissions denied, please contact your administrator.`);
			if (!kubeConfig) throw new Error(`This cluster doesn't have any "kube-config" data to authenticate.`);

			filePath = createTmpFile(`${clusterSlug}-kube-config.yaml`, kubeConfig);

			// start authenticating & save cluster access info to "kubeconfig"...
			cluster = await custom.authenticate(cluster, { filePath, isDebugging: options.isDebugging, ownership: options.ownership });
			if (!cluster) throw new Error(`Unable to authenticate this cluster: ${cluster.name}`);

			const { contextName, isVerified } = cluster;
			if (!contextName) throw new Error(`Context of "${clusterSlug}" cluster not found.`);
			if (!isVerified) throw new Error(`Unable to connect to "${clusterSlug}" cluster.`);

			// delete temporary file
			unlink(filePath, (err) => err && logError(`[CLUSTER AUTH] Remove tmp file:`, err));

			// switch context (if needed)
			if (shouldSwitchContextToThisCluster) await switchContext(contextName);

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterSlug}" cluster.`);

			return cluster;

		default:
			throw new Error(`❌ This provider (${providerShortName}) is not supported yet.`);
	}
};

/**
 * Authenticate current machine with the K8S cluster by its short name (context-name).
 * @param clusterSlug - A cluster name on the cloud provider (**NOT** a cluster in `kubeconfig`)
 */
export const authClusterBySlug = async (clusterSlug: string, options: ClusterAuthOptions) => {
	if (!clusterSlug) throw new Error(`Param "clusterSlug" is required.`);

	// find the cluster in the database:
	const { DB } = await import("@/modules/api/DB");
	let cluster = await DB.findOne("cluster", { slug: clusterSlug });

	if (!cluster) {
		throw new Error(
			`This cluster (${clusterSlug}) is not existed, please contact your administrator or register a new one with the CLI command.`
		);
	}

	return authCluster(cluster, options);
};

export default authCluster;
