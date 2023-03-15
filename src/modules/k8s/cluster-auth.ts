import { logError, logSuccess } from "diginext-utils/dist/console/log";
import { unlink } from "fs";

import type { Cluster } from "@/entities";
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
		const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
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
 *
 * @param clusterShortName - A cluster name on the cloud provider (**NOT** a cluster in `kubeconfig`)
 */
export const authCluster = async (clusterShortName: string, options: ClusterAuthOptions = { shouldSwitchContextToThisCluster: true }) => {
	let filePath: string;

	if (!clusterShortName) {
		throw new Error(`Param "clusterShortName" is required.`);
	}

	// find the cluster in the database:
	let cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });

	if (!cluster) {
		throw new Error(
			`This cluster (${clusterShortName}) is not existed, please contact your administrator or register a new one with the CLI command.`
		);
	}

	const { providerShortName } = cluster;

	if (!providerShortName) throw new Error(`Param "provider" (Cloud Provider's short name) is required.`);

	const { shouldSwitchContextToThisCluster } = options;

	let context: KubeConfigContext;

	// Check if Kubernetes context of the cluster is existed -> skip cluster authentication
	context = await getKubeContextByCluster(cluster);
	if (context) {
		logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterShortName}" cluster (Context: "${context.name}").`);
		return cluster;
	}

	switch (providerShortName) {
		case "gcloud":
			// Only support Google Service Account authentication
			const { serviceAccount } = cluster;
			if (!serviceAccount) {
				throw new Error(`This cluster doesn't have any Google Service Account to authenticate, please contact your administrator.`);
			}

			// start authenticating...
			filePath = createTmpFile(`gsa.json`, serviceAccount);
			const gcloudAuth = await gcloud.authenticate({ filePath });
			if (!gcloudAuth) {
				throw new Error(`[UNKNOWN] Cannot authenticate the Google Cloud provider.`);
			}
			// delete temporary service account
			unlink(filePath, (err) => err && logError(`[CLUSTER AUTH] Remove tmp file:`, err));

			// save this cluster to KUBE_CONFIG
			const { zone, projectID } = cluster;
			if (!zone) throw new Error(`ZONE is required for Google Cloud Cluster authentication.`);
			if (!projectID) throw new Error(`PROJECT_ID is required for Google Cloud Cluster authentication.`);

			// save cluster access info to "kubeconfig"
			await execCmd(`gcloud container clusters get-credentials ${clusterShortName} --zone=${zone} --project=${projectID}`);

			context = await getKubeContextByClusterShortName(clusterShortName, providerShortName);

			if (context) {
				[cluster] = await DB.update<Cluster>("cluster", { shortName: clusterShortName }, { contextName: context.name });
			} else {
				logError(`Context of "${clusterShortName}" cluster not found.`);
				return;
			}

			if (shouldSwitchContextToThisCluster) switchContext(context.name);

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterShortName}" cluster (Context: "${context.name}").`);

			return cluster;

		case "digitalocean":
			// Only support Digital Ocean API access token authentication
			const { apiAccessToken } = cluster;
			if (!apiAccessToken) {
				throw new Error(`This cluster doesn't have any Digital Ocean API access token to authenticate, please contact your administrator.`);
			}

			const doAuth = await digitalocean.authenticate({ key: apiAccessToken });
			if (!doAuth) {
				throw new Error(`[UNKNOWN] Cannot authenticate the Digital Ocean provider.`);
			}

			// save cluster access info to "kubeconfig"
			await execCmd(`doctl kubernetes cluster kubeconfig save ${clusterShortName}`);

			// get the context in "kubeconfig"
			context = await getKubeContextByClusterShortName(clusterShortName, providerShortName);

			if (context) {
				[cluster] = await DB.update<Cluster>("cluster", { shortName: clusterShortName }, { contextName: context.name });
			} else {
				logError(`Context of "${clusterShortName}" cluster not found.`);
				return;
			}

			if (shouldSwitchContextToThisCluster) switchContext(context.name);

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterShortName}" cluster (Context: "${context.name}").`);

			return cluster;

		case "custom":
			// Only support "kube-config" authentication
			const { kubeConfig } = cluster;
			if (!kubeConfig) {
				throw new Error(`This cluster doesn't have any "kube-config" data to authenticate, please contact your administrator.`);
			}

			filePath = createTmpFile(`${clusterShortName}-kube-config.yaml`, kubeConfig);

			// start authenticating & save cluster access info to "kubeconfig"...
			const contextName = await custom.authenticate({ filePath });

			if (contextName) {
				[cluster] = await DB.update<Cluster>("cluster", { shortName: clusterShortName }, { contextName: contextName });
			} else {
				logError(`Context of "${clusterShortName}" cluster not found.`);
				return;
			}

			// delete temporary file
			unlink(filePath, (err) => err && logError(`[CLUSTER AUTH] Remove tmp file:`, err));

			if (shouldSwitchContextToThisCluster) switchContext(contextName);

			logSuccess(`[CLUSTER MANAGER] ✓ Connected to "${clusterShortName}" cluster (Context: "${contextName}").`);

			return cluster;

		default:
			throw new Error(`❌ This provider (${providerShortName}) is not supported yet.`);
	}
};

export default authCluster;
