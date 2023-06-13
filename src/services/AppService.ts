import { isEmpty } from "lodash";

import type { ICluster } from "@/entities";
import type { IApp } from "@/entities/App";
import { appSchema } from "@/entities/App";
import type { DeployEnvironment, IQueryFilter, IQueryOptions, IQueryPagination, KubeDeployment } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import ClusterManager from "@/modules/k8s";

import BaseService from "./BaseService";

export type DeployEnvironmentApp = DeployEnvironment & {
	app: IApp;
	appSlug: string;
	cluster: ICluster;
};

export type KubeDeploymentOnCluster = KubeDeployment & {
	cluster: ICluster;
};

export default class AppService extends BaseService<IApp> {
	constructor() {
		super(appSchema);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<IApp[]> {
		const { status = false } = options || {};

		const apps = await super.find(filter, options, pagination);

		if (!status) return apps;

		// check app deploy environment's status in clusters
		const allClusterDeploys: { [cluster: string]: KubeDeploymentOnCluster[] } = {};

		const clusterFilter: any = {};
		if (filter?.workspace) clusterFilter.workspace = filter.workspace;
		const clusters = await DB.find<ICluster>("cluster", clusterFilter);

		await Promise.all(
			clusters.map(async (cluster) => {
				const deploys = await ClusterManager.getAllDeploys({ context: cluster.contextName });
				const clusterDeploys: KubeDeploymentOnCluster[] = deploys.map((deploy) => {
					return { ...deploy, cluster };
				});
				allClusterDeploys[cluster.shortName] = clusterDeploys;
				return clusterDeploys;
			})
		);
		// console.log("clusters :>> ", Object.keys(allClusterDeploys));

		return apps
			.map((app) => {
				if (app && app.deployEnvironment) {
					Object.keys(app.deployEnvironment).map((env) => {
						if (!app.deployEnvironment[env] && !app.deployEnvironment[env].cluster) {
							app.deployEnvironment[env].status = "undeployed";
							return;
						}

						app.deployEnvironment[env].readyCount = 0;

						const appClusterShortName = app.deployEnvironment[env].cluster;

						if (!allClusterDeploys[appClusterShortName]) {
							app.deployEnvironment[env].status = "undeployed";
							return;
						}

						const clusterDeploys = allClusterDeploys[appClusterShortName];
						if (clusterDeploys.length === 0) {
							app.deployEnvironment[env].status = "undeployed";
							return;
						}

						const deployOnCluster = clusterDeploys.find((deploy) => (deploy.metadata?.labels ?? {})["main-app"] === app.slug);

						if (!deployOnCluster) {
							app.deployEnvironment[env].status = "undeployed";
							return;
						}

						app.deployEnvironment[env].readyCount = deployOnCluster.status.readyReplicas ?? deployOnCluster.status.availableReplicas ?? 0;

						if (
							deployOnCluster.status.replicas === deployOnCluster.status.availableReplicas ||
							deployOnCluster.status.replicas === deployOnCluster.status.readyReplicas
						) {
							app.deployEnvironment[env].status = "healthy";
							return;
						}

						if (deployOnCluster.status.unavailableReplicas && deployOnCluster.status.unavailableReplicas > 0) {
							app.deployEnvironment[env].status = "partial_healthy";
							return;
						}

						if (
							deployOnCluster.status.availableReplicas === 0 ||
							deployOnCluster.status.unavailableReplicas === deployOnCluster.status.replicas ||
							deployOnCluster.status.readyReplicas === 0
						) {
							app.deployEnvironment[env].status = "failed";
							return;
						}

						app.deployEnvironment[env].status = "unknown";
					});
				}

				return app;
			})
			.filter((app) => typeof app !== "undefined");
	}

	async viewDeployEnvironmentLogs(app: IApp, env: string) {
		const deployEnvironment = app.deployEnvironment[env];

		const clusterShortName = deployEnvironment.cluster;
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: app.workspace });
		if (!cluster) return;

		const { contextName: context } = cluster;

		const pods = await ClusterManager.getPodsByFilter(deployEnvironment.namespace, { context });
		if (isEmpty(pods)) return;

		const logs: { [pod: string]: string } = {};

		await Promise.all(
			pods.map(async (pod) => {
				const podLogs = await ClusterManager.logPod(pod.metadata.name, deployEnvironment.namespace, { context });
				logs[pod.metadata.name] = podLogs;
				return podLogs;
			})
		);

		return logs;
	}
}

// export { AppService };
