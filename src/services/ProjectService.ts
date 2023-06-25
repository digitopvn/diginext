import { logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

import type { ICluster } from "@/entities";
import type { IProject } from "@/entities/Project";
import { projectSchema } from "@/entities/Project";
import type { IQueryFilter } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import ClusterManager from "@/modules/k8s";

import AppService from "./AppService";
import BaseService from "./BaseService";

export default class ProjectService extends BaseService<IProject> {
	constructor() {
		super(projectSchema);
	}

	async softDelete(filter?: IQueryFilter) {
		// find the project:
		const project = await this.findOne(filter);
		if (!project) return { ok: false, affected: 0 };

		// find all apps & environments, then take down all namespaces:
		const appSvc = new AppService();
		const appFilter = { project: project._id };
		const apps = await appSvc.find(appFilter);

		// delete all workloads of each deploy environment in an app:
		if (!isEmpty(apps)) {
			for (const app of apps) {
				if (!app.deployEnvironment) break;
				for (const [env, deployEnvironment] of Object.entries(app.deployEnvironment)) {
					if (!isEmpty(deployEnvironment)) {
						const { cluster: clusterShortName, namespace } = deployEnvironment;
						const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });

						if (cluster) {
							const { contextName: context } = cluster;
							// delete namespace
							ClusterManager.deleteNamespace(namespace, { context })
								.then(() =>
									logSuccess(`[PROJECT_DELETE] ${app.slug} > Deleted "${namespace}" namespace on "${cluster.name}" cluster.`)
								)
								.catch((e) =>
									logWarn(`[PROJECT_DELETE] ${app.slug} > Can't delete "${namespace}" namespace on "${cluster.name}" cluster:`, e)
								);
						}
					}
				}
			}

			// find all related apps and delete them all:
			const deletedApps = await appSvc.softDelete(appFilter);
			logWarn(`[ProjectService] Deleted ${deletedApps.affected} apps.`);
		}

		// delete the project in the database:
		const result = await super.softDelete(filter);
		return result;
	}
}
export { ProjectService };