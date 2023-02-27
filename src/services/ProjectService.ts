import { logError, logWarn } from "diginext-utils/dist/console/log";

import Project from "@/entities/Project";
import type { IQueryFilter } from "@/interfaces";
import { getAppEvironment } from "@/modules/apps/get-app-environment";
import ClusterManager from "@/modules/k8s";

import AppService from "./AppService";
import BaseService from "./BaseService";

export default class ProjectService extends BaseService<Project> {
	constructor() {
		super(Project);
	}

	async softDelete(filter?: IQueryFilter): Promise<{ ok?: number; error?: string }> {
		// find the project:
		const project = await this.findOne(filter);
		if (!project) return { error: `Project not found.` };

		// find all apps & environments, then take down all namespaces:
		const appSvc = new AppService();
		const appFilter = { project: project._id };
		const apps = await appSvc.find(appFilter);

		if (apps && apps.length > 0) {
			apps.forEach((app) => {
				const environments = Object.keys(app.environment);
				if (environments && environments.length > 0) {
					environments.forEach(async (env) => {
						const envConfig = await getAppEvironment(app, env);
						const { cluster, namespace } = envConfig;

						// switch to the cluster of this environment
						try {
							await ClusterManager.auth(cluster);
						} catch (e) {
							logError(e);
							// return { error: e.message };
						}

						// delete the whole namespace of this environment
						await ClusterManager.deleteNamespace(namespace);
					});
				}
			});
		}

		// find all related apps and delete them all:
		const deletedApps = await appSvc.softDelete(appFilter);
		logWarn(`[ProjectService] Deleted ${deletedApps.ok} apps.`);

		// delete the project in the database:
		const result = await super.softDelete(filter);
		return result;
	}
}
export { ProjectService };
