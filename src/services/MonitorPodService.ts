import type { IUser, IWorkspace } from "@/entities";
import type { KubePod } from "@/interfaces/KubePod";
import type { MonitoringQueryFilter, MonitoringQueryOptions } from "@/interfaces/MonitoringQuery";
import type { Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import { objectToFilterLabels } from "@/modules/k8s/kubectl";
import { MongoDB } from "@/plugins/mongodb";

export class MonitorPodService {
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
		const { namespace, cluster: clusterSlug } = filter;

		let data: KubePod[] = [];

		if (!clusterSlug) {
			const clusters = await DB.find("cluster", { workspace: this.workspace._id });
			const ls = await Promise.all(
				clusters.map(async (cluster) => {
					const { contextName: context } = cluster;
					if (!context) return [] as KubePod[];

					let list = namespace ? await ClusterManager.getPods(namespace, { context }) : await ClusterManager.getAllPods({ context });

					list = list.map((ns) => {
						ns.workspace = MongoDB.toString(this.workspace._id);
						ns.clusterSlug = cluster.slug;
						ns.cluster = MongoDB.toString(cluster._id);
						return ns;
					});
					return list;
				})
			);
			ls.map((nsList) => nsList.map((ns) => data.push(ns)));
		} else {
			const cluster = await DB.findOne("cluster", { slug: clusterSlug, workspace: this.workspace._id });
			if (!cluster) throw new Error(`Cluster "${clusterSlug}" not found.`);

			const { contextName: context } = cluster;
			if (!context) throw new Error(`Unverified cluster: "${clusterSlug}"`);

			data = namespace ? await ClusterManager.getPods(namespace, { context }) : await ClusterManager.getAllPods({ context });
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

	async delete(
		filter: MonitoringQueryFilter,
		data: {
			/**
			 * Service's name
			 */
			name: string;
		}
	) {
		const { DB } = await import("@/modules/api/DB");
		const { cluster: clusterSlug, namespace } = filter;
		const { name } = data;

		if (!clusterSlug) throw new Error(`Param "clusterSlug" is required.`);

		const cluster = await DB.findOne("cluster", { slug: clusterSlug, workspace: this.workspace._id });
		if (!cluster) throw new Error(`Cluster "${clusterSlug}" not found.`);

		const { contextName: context } = cluster;
		if (!context) throw new Error(`Unverified cluster: "${clusterSlug}"`);

		const result = name
			? await ClusterManager.deletePod(name, namespace, { context })
			: await ClusterManager.deletePodsByFilter(namespace, { context, filterLabel: objectToFilterLabels(filter.labels) });

		return result;
	}
}
