import { logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

import type { IProject } from "@/entities/Project";
import { projectSchema } from "@/entities/Project";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import { MongoDB } from "@/plugins/mongodb";
import { containsSpecialCharacters } from "@/plugins/string";
import { checkProjectPermissions, checkProjectPermissionsByFilter } from "@/plugins/user-utils";

import { AppService } from "./AppService";
import BaseService from "./BaseService";

export class ProjectService extends BaseService<IProject> {
	constructor(ownership?: Ownership) {
		super(projectSchema, ownership);
	}

	async find(filter?: IQueryFilter<IProject>, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<IProject[]> {
		if (this.user?.allowAccess?.projects?.length > 0) filter = { $or: [filter, { _id: { $in: this.user?.allowAccess?.projects } }] };

		return super.find(filter, options, pagination);
	}

	async create(data: any, options?: IQueryOptions): Promise<IProject> {
		// validate
		if (containsSpecialCharacters(data.name)) throw new Error(`Project name should not contain special characters.`);

		// process
		return super.create(data, options);
	}

	async update(filter: IQueryFilter<IProject>, data: any, options?: IQueryOptions): Promise<IProject[]> {
		// check access permissions
		await checkProjectPermissionsByFilter(this, filter, this.user);

		return super.update(filter, data, options);
	}

	async updateOne(filter: IQueryFilter<IProject>, data: any, options?: IQueryOptions): Promise<IProject> {
		// check permissions
		await checkProjectPermissionsByFilter(this, filter, this.user);

		return super.updateOne(filter, data, options);
	}

	async delete(filter?: IQueryFilter<IProject>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		// check permissions
		await checkProjectPermissionsByFilter(this, filter, this.user);

		// Delete all apps & deploy environments!
		const projects = await this.find(filter);
		if (projects.length > 0) {
			for (const project of projects) {
				const appSvc = new AppService(this.ownership);
				const appFilter = { project: project._id };
				try {
					const apps = await appSvc.find(appFilter);
					if (apps.length > 0) {
						for (const app of apps) {
							await appSvc.takeDown(app).then((_app) => appSvc.delete({ _id: _app._id }));
						}
					}
				} catch (e) {
					await appSvc.delete(appFilter).catch((err) => logWarn(`ProjectService > delete > delete apps :>>`, err));
				}
			}
		}

		return super.delete(filter, options);
	}

	async softDelete(filter?: IQueryFilter) {
		const { DB } = await import("@/modules/api/DB");

		// find the project:
		const project = await this.findOne(filter);
		if (!project) return { ok: false, affected: 0 };

		// check access permissions
		checkProjectPermissions(project);

		// check access permissions
		if (this.user && this.user.allowAccess?.projects) {
			if (!this.user.allowAccess?.projects.map((p) => MongoDB.toString(p)).includes(MongoDB.toString(project._id))) {
				throw new Error(`Permission denied.`);
			}
		}

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
						const { cluster: clusterSlug, namespace } = deployEnvironment;
						const cluster = await DB.findOne("cluster", { slug: clusterSlug });

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
			const deletedApps = await appSvc.delete(appFilter);
			logWarn(`[ProjectService] Deleted ${deletedApps.affected} apps.`);
		}

		// delete the project in the database:
		const result = await super.delete(filter);
		return result;
	}
}
