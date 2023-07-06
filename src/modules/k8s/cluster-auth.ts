import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import { unlink } from "fs";

import type { ICluster } from "@/entities";
import type { KubeConfigContext } from "@/interfaces";
import { createTmpFile, execCmd } from "@/plugins";

import { DB } from "../api/DB";
import custom from "../providers/custom";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import { getKubeContextByCluster, getKubeContextByClusterShortName } from "./kube-config";

export interface ClusterAuthOptions {
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

export const switchContextToCluster = async (clusterShortName: string, providerShortName?: string) => {
	let context: string;
	if (providerShortName) {
		const ctx = await getKubeContextByClusterShortName(clusterShortName, providerShortName);
		context = ctx.name;
	} else {
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		if (!cluster) {
			logError(`Can't switch to cluster "${clusterShortName}".`);
			return;
		}
		context = cluster.contextName;
		if (!context && cluster.providerShortName) {
			const ctx = await getKubeContextByClusterShortName(clusterShortName, cluster.providerShortName);
			context = ctx.name;
		}
	}

	if (!context) {
		logError(`[CLUSTER AUTH] Cannot switch current kube context to "${clusterShortName}"`);
		return;
	}

	const result = await execCmd(
		`kubectl config use-context ${context}`,
		`[CLUSTER AUTH] Cannot switch current kube context to "${clusterShortName}"`
	);

	return typeof result !== "undefined";
};

/**
 * Authenticate current machine with the K8S cluster by its short name (context-name).
 */
export const authCluster = async (cluster: ICluster, options: ClusterAuthOptions = { shouldSwitchContextToThisCluster: true }) => {
	let filePath: string;

	const { providerShortName, shortName: clusterShortName } = cluster;
	if (options?.isDebugging) console.log("cluster :>> ", cluster);

	if (!clusterShortName) throw new Error(`Param "shortName" (cluster's short name) is required.`);
	if (!providerShortName) throw new Error(`Param "provider" (Cloud Provider's short name) is required.`);

	const { shouldSwitchContextToThisCluster } = options;

	let context: KubeConfigContext;

	// Check if Kubernetes context of the cluster is existed in KUBE_CONFIG -> skip cluster authentication
	context = await getKubeContextByCluster(cluster);
	if (context && cluster.isVerified) {
		logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterShortName}" cluster.`);
		return cluster;
	}
	const { isVerified } = cluster;

	switch (providerShortName) {
		case "gcloud":
			// Only support Google Service Account authentication
			const { serviceAccount } = cluster;
			if (isVerified && !serviceAccount) throw new Error(`Permissions denied, please contact your administrator.`);
			if (!serviceAccount) throw new Error(`This cluster doesn't have any Google Service Account to authenticate.`);

			// start authenticating...
			filePath = createTmpFile(`gsa.json`, serviceAccount);
			const gcloudAuth = await gcloud.authenticate({ filePath });
			if (!gcloudAuth) throw new Error(`[UNKNOWN] Cannot authenticate the Google Cloud provider.`);

			// delete temporary service account
			unlink(filePath, (err) => err && logError(`[CLUSTER AUTH] Remove tmp file:`, err));

			// save this cluster to KUBE_CONFIG
			const { zone, projectID } = cluster;
			if (!zone) throw new Error(`ZONE is required for Google Cloud Cluster authentication.`);
			if (!projectID) throw new Error(`Google Cloud "PROJECT_ID" is required for GKE cluster authentication.`);

			// save cluster access info to "kubeconfig"
			await execCmd(`gcloud container clusters get-credentials ${clusterShortName} --zone=${zone} --project=${projectID}`);

			context = await getKubeContextByClusterShortName(clusterShortName, providerShortName);

			if (context) {
				[cluster] = await DB.update<ICluster>("cluster", { shortName: clusterShortName }, { contextName: context.name });
			} else {
				throw new Error(`Context of "${clusterShortName}" cluster not found.`);
			}

			if (shouldSwitchContextToThisCluster) switchContext(context.name);

			// mark this cluster verified
			[cluster] = await DB.update<ICluster>("cluster", { shortName: clusterShortName }, { isVerified: true });

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterShortName}" cluster.`);

			return cluster;

		case "digitalocean":
			// Only support Digital Ocean API access token authentication
			const { apiAccessToken } = cluster;
			if (isVerified && !apiAccessToken) throw new Error(`Permissions denied, please contact your administrator.`);
			if (!apiAccessToken) {
				throw new Error(`This cluster doesn't have any Digital Ocean API access token to authenticate.`);
			}

			const doAuth = await digitalocean.authenticate({ key: apiAccessToken });
			if (!doAuth) throw new Error(`[UNKNOWN] Cannot authenticate the Digital Ocean provider.`);

			// save cluster access info to "kubeconfig"
			await execCmd(`doctl kubernetes cluster kubeconfig save ${clusterShortName}`);

			// get the context in "kubeconfig"
			context = await getKubeContextByClusterShortName(clusterShortName, providerShortName);

			if (context) {
				[cluster] = await DB.update<ICluster>("cluster", { shortName: clusterShortName }, { contextName: context.name });
			} else {
				throw new Error(`Context of "${clusterShortName}" cluster not found.`);
			}

			if (shouldSwitchContextToThisCluster) switchContext(context.name);

			// mark this cluster verified
			[cluster] = await DB.update<ICluster>("cluster", { shortName: clusterShortName }, { isVerified: true });

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterShortName}" cluster.`);

			return cluster;

		case "custom":
			// Only support "kube-config" authentication
			const { kubeConfig } = cluster;
			if (isVerified && !kubeConfig) throw new Error(`Permissions denied, please contact your administrator.`);
			if (!kubeConfig) throw new Error(`This cluster doesn't have any "kube-config" data to authenticate.`);

			filePath = createTmpFile(`${clusterShortName}-kube-config.yaml`, kubeConfig);

			// start authenticating & save cluster access info to "kubeconfig"...
			const contextName = await custom.authenticate({ filePath });

			if (contextName) {
				[cluster] = await DB.update<ICluster>("cluster", { shortName: clusterShortName }, { contextName: contextName });
			} else {
				throw new Error(`Context of "${clusterShortName}" cluster not found.`);
			}

			// delete temporary file
			unlink(filePath, (err) => err && logError(`[CLUSTER AUTH] Remove tmp file:`, err));

			if (shouldSwitchContextToThisCluster) switchContext(contextName);

			// mark this cluster verified
			[cluster] = await DB.update<ICluster>("cluster", { shortName: clusterShortName }, { isVerified: true });

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterShortName}" cluster.`);

			return cluster;

		default:
			throw new Error(`❌ This provider (${providerShortName}) is not supported yet.`);
	}
};

/**
 * Authenticate current machine with the K8S cluster by its short name (context-name).
 * @param clusterShortName - A cluster name on the cloud provider (**NOT** a cluster in `kubeconfig`)
 */
export const authClusterByShortName = async (clusterShortName: string, options: ClusterAuthOptions = { shouldSwitchContextToThisCluster: true }) => {
	if (!clusterShortName) throw new Error(`Param "clusterShortName" is required.`);

	// find the cluster in the database:
	let cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });

	if (!cluster) {
		throw new Error(
			`This cluster (${clusterShortName}) is not existed, please contact your administrator or register a new one with the CLI command.`
		);
	}

	return authCluster(cluster);
};

export default authCluster;
