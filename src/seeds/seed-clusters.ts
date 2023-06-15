import { log } from "diginext-utils/dist/xconsole/log";
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

	console.log("kubeConfigObject :>> ", kubeConfigObject);
	console.log("clusterShortName :>> ", clusterShortName);

	// get custom provider
	const customCloudProvider = await DB.findOne<ICloudProvider>("provider", { shortName: "custom" });

	// insert new cluster
	const initialClusterDto: ICluster = {
		name: Config.grab("INITIAL_CLUSTER_NAME") || "Default Cluster",
		kubeConfig: initialClusterKubeConfig,
		active: true,
		shortName: clusterShortName,
		provider: customCloudProvider._id,
		providerShortName: "custom",
		owner: owner._id,
		workspace: workspace._id,
	};
	initialCluster = await DB.create<ICluster>("cluster", initialClusterDto);
	log(`Workspace "${workspace.name}" > Seeded "${initialClusterDto.name}" as initial cluster.`);

	// verfify cluster
	await ClusterManager.authCluster(initialCluster.shortName);

	// done
	return [initialCluster];
};
