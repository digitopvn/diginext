import yaml from "js-yaml";

import { Config } from "@/app.config";
import type { ICloudProvider, ICluster, IUser, IWorkspace } from "@/entities";
import type { KubeConfig } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import ClusterManager from "@/modules/k8s";

export const seedClusters = async (workspace: IWorkspace, owner: IUser) => {
	const initialClusterKubeConfig = Config.grab("INITIAL_CLUSTER_KUBECONFIG");
	if (!initialClusterKubeConfig) return;

	// skip if it's existed
	let initialCluster = await DB.findOne<ICluster>("cluster", { kubeConfig: initialClusterKubeConfig, workspace: workspace._id });
	if (initialCluster) return;

	// validate YAML
	const kubeConfigObject = yaml.load(initialClusterKubeConfig) as KubeConfig;
	const clusterShortName = kubeConfigObject.clusters[0].name;

	const clusterServer = kubeConfigObject.clusters[0].cluster?.server;
	if (!clusterServer) return;

	const clusterServerURL = new URL(clusterServer);
	const clusterIP = clusterServerURL?.hostname;
	if (!clusterIP) return;

	console.log("kubeConfigObject :>> ", kubeConfigObject);
	console.log("clusterShortName :>> ", clusterShortName);
	console.log("clusterIP :>> ", clusterIP);

	// get custom provider
	const customCloudProvider = await DB.findOne<ICloudProvider>("provider", { shortName: "custom" });

	// insert new cluster
	const initialClusterDto: ICluster = {
		name: Config.grab("INITIAL_CLUSTER_NAME") || "Default Cluster",
		kubeConfig: initialClusterKubeConfig,
		isDefault: true,
		active: true,
		shortName: clusterShortName,
		provider: customCloudProvider._id,
		primaryIP: clusterIP,
		providerShortName: "custom",
		owner: owner._id,
		workspace: workspace._id,
	};
	initialCluster = await DB.create<ICluster>("cluster", initialClusterDto);

	// verfify cluster
	await ClusterManager.authCluster(initialCluster);

	// done
	return [initialCluster];
};
