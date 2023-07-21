import { Body, Delete, Get, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IUser, IWorkspace } from "@/entities";
import type { IResponsePagination, KubeDeployment, KubeIngress, KubeSecret, KubeService } from "@/interfaces";
import { respondFailure, respondSuccess } from "@/interfaces";
import type { KubeNode } from "@/interfaces/KubeNode";
import type { KubePod } from "@/interfaces/KubePod";
import type { MonitoringQueryFilter, MonitoringQueryOptions } from "@/interfaces/MonitoringQuery";
import type { Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import { MongoDB } from "@/plugins/mongodb";
import { MonitorService } from "@/services/MonitorService";

@Tags("Monitor")
@Route("monitor")
export default class MonitorController {
	user: IUser;

	workspace: IWorkspace;

	ownership: Ownership;

	service = new MonitorService();

	filter: MonitoringQueryFilter;

	options: MonitoringQueryOptions;

	pagination: IResponsePagination;

	/**
	 * List of nodes in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/nodes")
	async getNodes(@Queries() queryParams?: { clusterSlug: string }) {
		const { DB } = await import("@/modules/api/DB");
		let { cluster: clusterSlug } = this.filter;

		let data: KubeNode[] = [];

		if (!clusterSlug) {
			const clusters = await DB.find("cluster", { workspace: this.workspace._id });
			const ls = await Promise.all(
				clusters.map(async (cluster) => {
					const { contextName: context } = cluster;
					if (!context) return [] as KubeNode[];
					let nodeList = await ClusterManager.getAllNodes({ context });
					nodeList = nodeList.map((ns) => {
						ns.workspace = MongoDB.toString(this.workspace._id);
						ns.clusterSlug = cluster.slug;
						ns.cluster = MongoDB.toString(cluster._id);
						return ns;
					});
					return nodeList;
				})
			);
			ls.map((nsList) => nsList.map((ns) => data.push(ns)));
		} else {
			const cluster = await DB.findOne("cluster", { slug: clusterSlug, workspace: this.workspace._id });
			if (!cluster) return respondFailure(`Cluster "${clusterSlug}" not found.`);

			const { contextName: context } = cluster;
			if (!context) return respondFailure(`Unverified cluster: "${clusterSlug}"`);

			data = await ClusterManager.getAllNodes({ context });
			data = data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterSlug = cluster.slug;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			});
		}

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of namespaces in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/namespaces")
	async getNamespaces(@Queries() queryParams?: { clusterSlug: string }) {
		const { MonitorNamespaceService } = await import("@/services/MonitorNamespaceService");
		const nsSvc = new MonitorNamespaceService(this.ownership);
		const data = await nsSvc.find(this.filter, this.options);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Create namespace in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/namespaces")
	async createNamespace(
		@Body()
		body?: {
			/**
			 * Namespace's name
			 */
			name: string;
		},
		@Queries() queryParams?: { clusterSlug: string }
	) {
		const { MonitorNamespaceService } = await import("@/services/MonitorNamespaceService");
		const nsSvc = new MonitorNamespaceService(this.ownership);
		const data = await nsSvc.create(this.filter, body);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Create namespace in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/namespaces")
	async deleteNamespace(
		@Body()
		body?: {
			/**
			 * Namespace's name
			 */
			name: string;
		},
		@Queries() queryParams?: { clusterSlug: string }
	) {
		const { MonitorNamespaceService } = await import("@/services/MonitorNamespaceService");
		const nsSvc = new MonitorNamespaceService(this.ownership);
		const data = await nsSvc.delete(this.filter, body);

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S services
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/services")
	async getServices(@Queries() queryParams?: { clusterSlug: string; namespace?: string }) {
		const { MonitorServiceService } = await import("@/services/MonitorServiceService");
		const serviceSvc = new MonitorServiceService(this.ownership);
		const data = await serviceSvc.find(this.filter, this.options);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Create service in a namespace
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/services")
	async createService(
		@Body()
		body?: {
			/**
			 * Namespace's name
			 */
			name: string;
			/**
			 * @default "default"
			 */
			namespace?: string;
			/**
			 * Labels
			 */
			labels?: {
				[key: string]: string;
			};
			/**
			 * Spec
			 */
			spec: KubeService["spec"];
		},
		@Queries()
		queryParams?: {
			clusterSlug: string;
		}
	) {
		const { MonitorServiceService } = await import("@/services/MonitorServiceService");
		const serviceSvc = new MonitorServiceService(this.ownership);
		const data = await serviceSvc.create(this.filter, body);

		return respondSuccess({ data });
	}

	/**
	 * Delete service in a namespace
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/services")
	async deleteService(
		@Body()
		body?: {
			/**
			 * Service's name
			 */
			name: string;
		},
		@Queries()
		queryParams?: {
			clusterSlug: string;
			namespace: string;
		}
	) {
		const { MonitorServiceService } = await import("@/services/MonitorServiceService");
		const serviceSvc = new MonitorServiceService(this.ownership);
		const data = await serviceSvc.delete(this.filter, body);

		return respondSuccess({ data });
	}

	/**
	 * List of K8S Ingress
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/ingresses")
	async getIngresses(@Queries() queryParams?: { clusterSlug: string; namespace?: string }) {
		const { DB } = await import("@/modules/api/DB");
		const { namespace, cluster: clusterSlug } = this.filter;

		let data: KubeIngress[] = [];

		if (!clusterSlug) {
			const clusters = await DB.find("cluster", { workspace: this.workspace._id });
			const ls = await Promise.all(
				clusters.map(async (cluster) => {
					const { contextName: context } = cluster;
					if (!context) return [] as KubeIngress[];

					let nsList = namespace
						? await ClusterManager.getIngresses(namespace, { context })
						: await ClusterManager.getAllIngresses({ context });

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
			const cluster = await DB.findOne("cluster", { slug: clusterSlug, workspace: this.workspace._id });
			if (!cluster) return respondFailure(`Cluster "${clusterSlug}" not found.`);

			const { contextName: context } = cluster;
			if (!context) return respondFailure(`Unverified cluster: "${clusterSlug}"`);

			data = namespace ? await ClusterManager.getIngresses(namespace, { context }) : await ClusterManager.getAllIngresses({ context });
			data = data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterSlug = cluster.slug;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			});
		}

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S Deployment
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/deployments")
	async getDeploys(@Queries() queryParams?: { clusterSlug: string; namespace?: string }) {
		const { DB } = await import("@/modules/api/DB");
		const { namespace, cluster: clusterSlug } = this.filter;

		let data: KubeDeployment[] = [];

		if (!clusterSlug) {
			const clusters = await DB.find("cluster", { workspace: this.workspace._id });
			const ls = await Promise.all(
				clusters.map(async (cluster) => {
					const { contextName: context } = cluster;
					if (!context) return [] as KubeDeployment[];

					let nsList = namespace
						? await ClusterManager.getDeploys(namespace, { context })
						: await ClusterManager.getAllDeploys({ context });

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
			const cluster = await DB.findOne("cluster", { slug: clusterSlug, workspace: this.workspace._id });
			if (!cluster) return respondFailure(`Cluster "${clusterSlug}" not found.`);

			const { contextName: context } = cluster;
			if (!context) return respondFailure(`Unverified cluster: "${clusterSlug}"`);

			data = namespace ? await ClusterManager.getDeploys(namespace, { context }) : await ClusterManager.getAllDeploys({ context });
			data = data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterSlug = cluster.slug;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			});
		}

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S Pod
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/pods")
	async getPods(@Queries() queryParams?: { clusterSlug: string; namespace?: string }) {
		const { DB } = await import("@/modules/api/DB");
		const { namespace, cluster: clusterSlug } = this.filter;

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
			if (!cluster) return respondFailure(`Cluster "${clusterSlug}" not found.`);

			const { contextName: context } = cluster;
			if (!context) return respondFailure(`Unverified cluster: "${clusterSlug}"`);

			data = namespace ? await ClusterManager.getPods(namespace, { context }) : await ClusterManager.getAllPods({ context });
			data = data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterSlug = cluster.slug;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			});
		}

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S Secret
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/secrets")
	async getSecrets(@Queries() queryParams?: { clusterSlug: string; namespace?: string }) {
		const { DB } = await import("@/modules/api/DB");
		const { namespace, cluster: clusterSlug } = this.filter;

		let data: KubeSecret[] = [];

		if (!clusterSlug) {
			const clusters = await DB.find("cluster", { workspace: this.workspace._id });
			const ls = await Promise.all(
				clusters.map(async (cluster) => {
					const { contextName: context } = cluster;
					if (!context) return [] as KubeSecret[];

					let nsList = namespace
						? await ClusterManager.getSecrets(namespace, { context })
						: await ClusterManager.getAllSecrets({ context });

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
			const cluster = await DB.findOne("cluster", { slug: clusterSlug, workspace: this.workspace._id });
			if (!cluster) return respondFailure(`Cluster "${clusterSlug}" not found.`);

			const { contextName: context } = cluster;
			if (!context) return respondFailure(`Unverified cluster: "${clusterSlug}"`);

			data = namespace ? await ClusterManager.getSecrets(namespace, { context }) : await ClusterManager.getAllSecrets({ context });
			data = data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterSlug = cluster.slug;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			});
		}

		// process
		return respondSuccess({ data });
	}
}
