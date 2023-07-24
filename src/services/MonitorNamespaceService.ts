import type { IUser, IWorkspace } from "@/entities";
import type { KubeNamespace } from "@/interfaces";
import type { MonitoringQueryFilter, MonitoringQueryOptions, MonitoringQueryParams } from "@/interfaces/MonitoringQuery";
import type { Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import { MongoDB } from "@/plugins/mongodb";

export class MonitorNamespaceService {
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
		const { DB } = await import("@/modules/api/DB");
		const { cluster: clusterSlugOrId } = filter;
		const { name } = data;

		if (!clusterSlugOrId) throw new Error(`Param "clusterSlug" is required.`);

		const cluster = await DB.findOne("cluster", { $or: [{ slug: clusterSlugOrId }, { _id: clusterSlugOrId }], workspace: this.workspace._id });
		if (!cluster) throw new Error(`Cluster "${clusterSlugOrId}" not found.`);

		const { contextName: context } = cluster;
		if (!context) throw new Error(`Unverified cluster: "${clusterSlugOrId}"`);

		// check name existed
		const isExisted = await ClusterManager.isNamespaceExisted(name);
		if (isExisted) throw new Error(`Namespace "${name}" is existed.`);

		const namespace = await ClusterManager.createNamespace(name, { context });
		// namespace.workspace = MongoDB.toString(this.workspace._id);
		// namespace.clusterSlug = clusterSlug;
		// namespace.cluster = MongoDB.toString(cluster._id);

		return namespace;
	}

	async find(filter: MonitoringQueryFilter, options?: MonitoringQueryOptions) {
		const { DB } = await import("@/modules/api/DB");
		let { cluster: clusterIdOrSlug, name } = filter;

		let data: KubeNamespace[] = [];

		if (!clusterIdOrSlug) {
			const clusters = await DB.find("cluster", { workspace: this.workspace._id });
			const ls = await Promise.all(
				clusters.map(async (_cluster) => {
					const { contextName: context } = _cluster;
					if (!context) return [] as KubeNamespace[];

					let nsList = name
						? [(await ClusterManager.getNamespace(name, { context, output: options?.output })) as KubeNamespace]
						: await ClusterManager.getAllNamespaces({ context, output: options?.output });

					nsList = nsList.map((ns) => {
						ns.workspace = MongoDB.toString(this.workspace._id);
						ns.clusterSlug = _cluster.slug;
						ns.cluster = MongoDB.toString(_cluster._id);
						return ns;
					});
					return nsList;
				})
			);
			ls.map((nsList) => nsList.map((ns) => data.push(ns)));
		} else {
			const cluster = await DB.findOne("cluster", {
				$or: [{ slug: clusterIdOrSlug }, { _id: clusterIdOrSlug }],
				workspace: this.workspace._id,
			});
			if (!cluster) throw new Error(`Cluster "${cluster}" not found.`);

			const { contextName: context } = cluster;
			if (!context) throw new Error(`Unverified cluster: "${cluster}"`);

			data = name
				? [(await ClusterManager.getNamespace(name, { context, output: options?.output })) as KubeNamespace]
				: await ClusterManager.getAllNamespaces({ context, output: options?.output });

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
		const { cluster: clusterSlugOrId, name } = params;

		if (!clusterSlugOrId) throw new Error(`Param "cluster" is required.`);
		if (!name) throw new Error(`Param "name" is required.`);

		const cluster = await DB.findOne("cluster", { $or: [{ slug: clusterSlugOrId }, { _id: clusterSlugOrId }], workspace: this.workspace._id });
		if (!cluster) throw new Error(`Cluster "${clusterSlugOrId}" not found.`);

		const { contextName: context } = cluster;
		if (!context) throw new Error(`Unverified cluster: "${clusterSlugOrId}"`);

		// check name existed
		const isExisted = await ClusterManager.isNamespaceExisted(name);
		if (isExisted) throw new Error(`Namespace "${name}" is existed.`);

		const namespace = await ClusterManager.deleteNamespace(name, { context });
		// namespace.workspace = MongoDB.toString(this.workspace._id);
		// namespace.clusterSlug = clusterSlug;
		// namespace.cluster = MongoDB.toString(cluster._id);

		return namespace;
	}
}
