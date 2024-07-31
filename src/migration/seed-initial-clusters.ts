import yaml from "js-yaml";
import { isEmpty } from "lodash";
import mongoose from "mongoose";

import { Config } from "@/app.config";
import { clusterSchema, workspaceSchema } from "@/entities";
import type { KubeConfig } from "@/interfaces";
import { addInitialBareMetalCluster } from "@/seeds/seed-clusters";
import { UserService } from "@/services";

export const seedInitialClusters = async () => {
	const { WorkspaceService } = await import("@/services/WorkspaceService");
	const { ClusterService } = await import("@/services/ClusterService");
	const clusterSvc = new ClusterService();
	const workspaceSvc = new WorkspaceService();
	const userSvc = new UserService();

	if (Config.grab("INITIAL_CLUSTER_KUBECONFIG")) {
		// find all workspaces that don't have this initial cluster
		const kubeConfig = Config.grab("INITIAL_CLUSTER_KUBECONFIG");
		try {
			const Cluster = mongoose.model("clusters", clusterSchema, "clusters");
			const Workspace = mongoose.model("workspaces", workspaceSchema, "workspaces");

			// validate YAML
			const kubeConfigObject = yaml.load(kubeConfig) as KubeConfig;
			const clusterServer = kubeConfigObject.clusters[0].cluster?.server;
			if (!clusterServer) return;

			// extract cluster server URL & IP address
			const clusterServerURL = new URL(clusterServer);
			const clusterIP = clusterServerURL?.hostname;
			if (!clusterIP) return;

			// Tìm initial cluster
			const initialCluster = await Cluster.find({
				primaryIP: clusterIP,
				kubeConfig: { $regex: kubeConfigObject.clusters[0].cluster["certificate-authority-data"] },
			});
			console.log("initialCluster :>> ", initialCluster);
			if (isEmpty(initialCluster)) {
				const cluster = await addInitialBareMetalCluster(kubeConfig);
				console.log("Added initial cluster!");
			}

			// // Tìm tất cả workspace có clusters với "kubeConfig" là "kubeConfig"
			// const workspaceIdsWithInitialCluster = await Cluster.find({
			// 	primaryIP: clusterIP,
			// 	kubeConfig: { $regex: kubeConfigObject.clusters[0].cluster["certificate-authority-data"] },
			// }).distinct("workspace");
			// console.log("workspaceIdsWithInitialCluster :>> ", workspaceIdsWithInitialCluster.length);

			// // Tìm các workspace không có trong danh sách trên
			// const workspacesWithoutInitialCluster = await workspaceSvc.find({
			// 	_id: { $nin: workspaceIdsWithInitialCluster },
			// });
			// // console.log("workspacesWithoutInitialCluster :>> ", workspacesWithoutInitialCluster);
			// console.log("workspacesWithoutInitialCluster :>> ", workspacesWithoutInitialCluster.length);

			// // Tạo cluster cho tất cả workspace
			// workspacesWithoutInitialCluster.forEach(async (workspace) => {
			// 	const owner = await userSvc.findOne({ _id: workspace.owner });
			// 	if (!owner) {
			// 		console.error(`Error: owner "${workspace.owner}" not found -> delete workspace!`);
			// 		await Workspace.deleteOne({ _id: workspace._id });
			// 		return;
			// 	}
			// 	const cluster = await addInitialBareMetalCluster(kubeConfig, workspace, owner);
			// 	console.log("Added initial cluster to workspace :>> ", workspace.name, workspace._id);
			// });

			// return workspacesWithoutInitialCluster;
		} catch (error) {
			console.error("Error:", error);
			throw error;
		}
	}
};
