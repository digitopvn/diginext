import yaml from "js-yaml";

import { Config } from "@/app.config";
import type { ICluster, IUser, IWorkspace } from "@/entities";
import type { KubeConfig } from "@/interfaces";
import ClusterManager from "@/modules/k8s";

export const addInitialBareMetalCluster = async (kubeConfig: string, workspace: IWorkspace, owner: IUser) => {
	const initialClusterKubeConfig = kubeConfig;
	if (!initialClusterKubeConfig) return;

	const { DB } = await import("@/modules/api/DB");

	// skip if it's existed
	let initialCluster = await DB.findOne("cluster", { kubeConfig: initialClusterKubeConfig, workspace: workspace._id });
	if (initialCluster) return;

	// validate YAML
	const kubeConfigObject = yaml.load(initialClusterKubeConfig) as KubeConfig;
	const clusterServer = kubeConfigObject.clusters[0].cluster?.server;
	if (!clusterServer) return;

	// extract cluster server URL & IP address
	const clusterServerURL = new URL(clusterServer);
	const clusterIP = clusterServerURL?.hostname;
	if (!clusterIP) return;

	// console.log("kubeConfigObject :>> ", kubeConfigObject);
	// console.log("clusterIP :>> ", clusterIP);

	// get custom provider
	const customCloudProvider = await DB.findOne("provider", { shortName: "custom" });
	// console.log("customCloudProvider :>> ", customCloudProvider);

	// insert new cluster
	const initialClusterDto: ICluster = {
		name: Config.grab("INITIAL_CLUSTER_NAME") || "Default Cluster",
		providerShortName: "custom",
		provider: customCloudProvider._id,
		isDefault: true,
		active: true,
		kubeConfig: initialClusterKubeConfig,
		primaryIP: clusterIP,
		owner: owner._id,
		workspace: workspace._id,
	};
	initialCluster = await DB.create("cluster", initialClusterDto);
	// console.log("initialCluster.slug :>> ", initialCluster.slug);

	// verfify cluster
	initialCluster = await ClusterManager.authCluster(initialCluster);

	// done
	return initialCluster;
};

export const seedClusters = async (workspace: IWorkspace, owner: IUser) => {
	const initialClusterKubeConfig = Config.grab("INITIAL_CLUSTER_KUBECONFIG");
	if (!initialClusterKubeConfig) return;

	return addInitialBareMetalCluster(initialClusterKubeConfig, workspace, owner);
};
