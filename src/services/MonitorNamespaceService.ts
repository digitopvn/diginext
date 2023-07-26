import type { IUser, IWorkspace } from "@/entities";
import type { KubeNamespace } from "@/interfaces";
import type {
	MonitoringCreateOptions,
	MonitoringNamespaceQueryFilter,
	MonitoringQueryFilter,
	MonitoringQueryOptions,
} from "@/interfaces/MonitoringQuery";
import type { Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import { MongoDB } from "@/plugins/mongodb";

export type MonitorNamespaceCreateData = {
	/**
	 * Namespace's name
	 */
	name: string;
	/**
	 * Cluster's ID or SLUG
	 */
	cluster?: string;
	/**
	 * Filter by labels
	 */
	labels?: Record<string, string>;
};

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

	async create(data: MonitorNamespaceCreateData, options?: MonitoringCreateOptions) {
		const { DB } = await import("@/modules/api/DB");
		const { name, cluster: clusterSlugOrId } = data;

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

	async find(filter: MonitoringNamespaceQueryFilter, options?: MonitoringQueryOptions) {
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
			const clusterFilter = MongoDB.isValidObjectId(clusterIdOrSlug) ? { _id: clusterIdOrSlug } : { slug: clusterIdOrSlug };
			const cluster = await DB.findOne("cluster", {
				...clusterFilter,
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

	async findOne(filter: MonitoringNamespaceQueryFilter, options?: MonitoringQueryOptions) {
		const data = await this.find(filter, options);
		return data[0];
	}

	async allResources(filter: MonitoringNamespaceQueryFilter, options?: MonitoringQueryOptions) {
		const {
			MonitorDeploymentService,
			MonitorIngressService,
			MonitorPodService,
			MonitorSecretService,
			MonitorServiceService,
			MonitorStatefulSetService,
			// pvc
		} = await import("./MonitorService");

		const resourceFilter: MonitoringQueryFilter = {};
		resourceFilter.cluster = filter.cluster;
		resourceFilter.namespace = filter.name;
		resourceFilter.labels = filter.labels;

		// get ingresses
		const ingSvc = new MonitorIngressService(this.ownership);
		const ingresses = await ingSvc.find(resourceFilter, options);

		// get services
		const svcSvc = new MonitorServiceService(this.ownership);
		const services = await svcSvc.find(resourceFilter, options);

		// get deployments
		const deploymentSvc = new MonitorDeploymentService(this.ownership);
		const deployments = await deploymentSvc.find(resourceFilter, options);

		// get statefulsets
		const statefulSetSvc = new MonitorStatefulSetService(this.ownership);
		const statefulSets = await statefulSetSvc.find(resourceFilter, options);

		// get pods
		const podSvc = new MonitorPodService(this.ownership);
		const pods = await podSvc.find(resourceFilter, options);

		// get persistent volume claims

		// get secrets
		const secretSvc = new MonitorSecretService(this.ownership);
		const secrets = await secretSvc.find(resourceFilter, options);

		return { ingresses, services, deployments, statefulSets, pods, secrets };
	}

	async delete(params: MonitoringNamespaceQueryFilter) {
		const { DB } = await import("@/modules/api/DB");
		const { cluster: clusterSlugOrId, name } = params;

		if (!clusterSlugOrId) throw new Error(`Param "cluster" is required.`);
		if (!name) throw new Error(`Param "name" is required.`);

		const clusterFilter = MongoDB.isValidObjectId(clusterSlugOrId) ? { _id: clusterSlugOrId } : { slug: clusterSlugOrId };
		const cluster = await DB.findOne("cluster", { ...clusterFilter, workspace: this.workspace._id });
		if (!cluster) throw new Error(`Cluster "${clusterSlugOrId}" not found.`);

		const { contextName: context } = cluster;
		if (!context) throw new Error(`Unverified cluster: "${clusterSlugOrId}"`);

		// check name existed
		const isExisted = await ClusterManager.isNamespaceExisted(name);
		if (!isExisted) throw new Error(`Namespace "${name}" not found.`);

		const namespace = await ClusterManager.deleteNamespace(name, { context });
		// namespace.workspace = MongoDB.toString(this.workspace._id);
		// namespace.clusterSlug = clusterSlug;
		// namespace.cluster = MongoDB.toString(cluster._id);

		return namespace;
	}
}
