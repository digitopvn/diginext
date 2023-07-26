import type { IUser, IWorkspace } from "@/entities";
import type { KubeDeployment } from "@/interfaces";
import type { MonitoringQueryFilter, MonitoringQueryOptions, MonitoringQueryParams } from "@/interfaces/MonitoringQuery";
import type { Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import { objectToFilterLabels } from "@/modules/k8s/kubectl";
import { MongoDB } from "@/plugins/mongodb";

export class MonitorDeploymentService {
	/**
	 * Current login user
	 */
	user?: IUser;

	/**
	 * Current active workspace
	 */
	workspace?: IWorkspace;

	/**
	 * Current owner & workspace
	 */
	ownership?: Ownership;

	constructor(ownership?: Ownership) {
		this.ownership = ownership;
		this.user = ownership?.owner;
		this.workspace = ownership?.workspace;
	}

	async create(
		filter: MonitoringQueryFilter,
		data: {
			/**
			 * Namespace's name
			 */
			name: string;
		}
	) {
		throw new Error(`This feature is under development`);
	}

	async find(filter: MonitoringQueryFilter, options?: MonitoringQueryOptions) {
		const { DB } = await import("@/modules/api/DB");
		const { namespace, cluster: clusterSlugOrId } = filter;

		let data: KubeDeployment[] = [];

		if (!clusterSlugOrId) {
			const clusters = await DB.find("cluster", { workspace: this.workspace._id });
			const ls = await Promise.all(
				clusters.map(async (cluster) => {
					const { contextName: context } = cluster;
					if (!context) return [] as KubeDeployment[];

					let nsList = namespace
						? await ClusterManager.getDeploys(namespace, { context, output: options?.output })
						: await ClusterManager.getAllDeploys({ context, output: options?.output });

					nsList = nsList.map((ns) => {
						ns.workspace = MongoDB.toString(this.workspace._id);
						ns.clusterSlug = cluster.slug;
						ns.cluster = MongoDB.toString(cluster._id);
						return ns;
					});
					return nsList;
				})
			);
			ls.map((nsList) => nsList.map((ns) => data.push(ns)));
		} else {
			const cluster = await DB.findOne("cluster", {
				$or: [{ slug: clusterSlugOrId }, { _id: clusterSlugOrId }],
				workspace: this.workspace._id,
			});
			if (!cluster) throw new Error(`Cluster "${clusterSlugOrId}" not found.`);

			const { contextName: context } = cluster;
			if (!context) throw new Error(`Unverified cluster: "${clusterSlugOrId}"`);

			data = namespace
				? await ClusterManager.getDeploys(namespace, { context, output: options?.output })
				: await ClusterManager.getAllDeploys({ context, output: options?.output });

			data = data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterSlug = cluster.slug;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			});
		}

		return data;
	}

	async findOne(filter: MonitoringQueryFilter, options?: MonitoringQueryOptions) {
		const data = await this.find(filter, options);
		return data[0];
	}

	async delete(params: MonitoringQueryParams) {
		const { DB } = await import("@/modules/api/DB");
		const { cluster: clusterSlugOrId, namespace, name } = params;

		if (!clusterSlugOrId) throw new Error(`Param "cluster" (slug or id) is required.`);
		if (!name) throw new Error(`Param "name" is required.`);

		const cluster = await DB.findOne("cluster", { $or: [{ slug: clusterSlugOrId }, { _id: clusterSlugOrId }], workspace: this.workspace._id });
		if (!cluster) throw new Error(`Cluster "${clusterSlugOrId}" not found.`);

		const { contextName: context } = cluster;
		if (!context) throw new Error(`Unverified cluster: "${clusterSlugOrId}"`);

		const result = name
			? await ClusterManager.deleteDeploy(name, namespace, { context })
			: await ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: objectToFilterLabels(params.labels) });

		return result;
	}
}