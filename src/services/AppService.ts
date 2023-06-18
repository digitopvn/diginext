import { isEmpty } from "lodash";

import type { ICluster } from "@/entities";
import type { IApp } from "@/entities/App";
import { appSchema } from "@/entities/App";
import type { DeployEnvironment, IQueryFilter, IQueryOptions, IQueryPagination, KubeDeployment } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import getDeploymentName from "@/modules/deploy/generate-deployment-name";
import ClusterManager from "@/modules/k8s";
import { makeSlug } from "@/plugins/slug";

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

		// always populate "project" field
		// options.populate =
		// 	!options.populate || options.populate.length === 0
		// 		? (options.populate = ["project"])
		// 		: [...options.populate.filter((field) => field !== "project"), "project"];

		const apps = await super.find(filter, options, pagination);

		if (!status) return apps;

		const clusterFilter: any = {};
		if (filter?.workspace) clusterFilter.workspace = filter.workspace;
		const clusters = await DB.find<ICluster>("cluster", clusterFilter);

		// check app deploy environment's status in clusters
		const appsWithStatus = await Promise.all(
			apps
				.map(async (app) => {
					if (app && app.deployEnvironment) {
						for (const env of Object.keys(app.deployEnvironment)) {
							if (!app.deployEnvironment[env]) app.deployEnvironment[env] = { buildNumber: "" };

							// default values
							app.deployEnvironment[env].readyCount = 0;
							app.deployEnvironment[env].status = "undeployed";

							if (!app.deployEnvironment[env].cluster) return app;

							// find cluster & namespace
							const clusterShortName = app.deployEnvironment[env].cluster;
							const cluster = clusters.find((_cluster) => _cluster.shortName === clusterShortName);
							if (!cluster) return app;

							const { contextName: context } = cluster;
							if (!context) return app;

							const { namespace } = app.deployEnvironment[env];
							if (!namespace) return app;

							// find workloads base on "main-app" label
							const mainAppName = await getDeploymentName(app);
							const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();
							let [deployOnCluster] = await ClusterManager.getDeploys(namespace, {
								filterLabel: `main-app=${mainAppName}`,
								context,
							});
							if (!deployOnCluster)
								[deployOnCluster] = await ClusterManager.getDeploys(namespace, {
									filterLabel: `main-app=${deprecatedMainAppName}`,
									context,
								});

							// console.log(`----- ${app.name} -----`);
							// console.log("- mainAppName :>> ", mainAppName);
							// console.log("- deployOnCluster.metadata.name :>> ", deployOnCluster?.metadata?.name);
							// console.log("- deployOnCluster.status.replicas :>> ", deployOnCluster?.status?.replicas);
							// console.log("- deployOnCluster.status.readyReplicas :>> ", deployOnCluster?.status?.readyReplicas);
							// console.log("- deployOnCluster.status.availableReplicas :>> ", deployOnCluster?.status?.availableReplicas);
							// console.log("- deployOnCluster.status.unavailableReplicas :>> ", deployOnCluster?.status?.unavailableReplicas);

							if (!deployOnCluster) {
								app.deployEnvironment[env].status = "undeployed";
								return app;
							}

							app.deployEnvironment[env].readyCount =
								deployOnCluster.status.readyReplicas ?? deployOnCluster.status.availableReplicas ?? 0;
							// console.log("- app.deployEnvironment[env].readyCount :>> ", app.deployEnvironment[env].readyCount);

							if (
								deployOnCluster.status.replicas === deployOnCluster.status.availableReplicas ||
								deployOnCluster.status.replicas === deployOnCluster.status.readyReplicas
							) {
								app.deployEnvironment[env].status = "healthy";
								return app;
							}

							if (deployOnCluster.status.unavailableReplicas && deployOnCluster.status.unavailableReplicas > 0) {
								app.deployEnvironment[env].status = "partial_healthy";
								return app;
							}

							if (
								deployOnCluster.status.availableReplicas === 0 ||
								deployOnCluster.status.unavailableReplicas === deployOnCluster.status.replicas ||
								deployOnCluster.status.readyReplicas === 0
							) {
								app.deployEnvironment[env].status = "failed";
								return app;
							}

							app.deployEnvironment[env].status = "unknown";
						}
					}

					return app;
				})
				.filter((app) => typeof app !== "undefined")
		);

		return appsWithStatus;
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
