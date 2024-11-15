import type { NextFunction } from "express-serve-static-core";
import { Body, Delete, Get, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IUser, IWorkspace } from "@/entities";
import type { IResponsePagination, KubeService } from "@/interfaces";
import { respondFailure, respondSuccess } from "@/interfaces";
import type { KubeNode } from "@/interfaces/KubeNode";
import type { MonitoringQueryFilter } from "@/interfaces/MonitoringQuery";
import { MonitoringNamespaceQueryFilter, MonitoringQueryOptions, MonitoringQueryParams } from "@/interfaces/MonitoringQuery";
import type { AppRequest, Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import { parseFilterAndOptions } from "@/plugins/controller-parser";
import { MongoDB } from "@/plugins/mongodb";
import { ClusterService } from "@/services";
import { MonitorNamespaceCreateData, MonitorService } from "@/services/MonitorService";

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
	 * Parse the filter & option from the URL
	 */
	parseFilter(req: AppRequest, res?: Response, next?: NextFunction) {
		const parsed = parseFilterAndOptions(req);

		// assign to controller:
		this.options = parsed.options;
		this.filter = parsed.filter as MonitoringQueryFilter;

		if (next) next();
	}

	/**
	 * List of nodes in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/nodes")
	async getNodes(@Queries() queryParams?: MonitoringQueryParams) {
		const { DB } = await import("@/modules/api/DB");
		// console.log("this.filter :>> ", this.filter);
		const clusterSvc = new ClusterService(this.ownership);
		let { cluster: clusterSlugOrId, ...restFilter } = this.filter;

		let data: KubeNode[] = [];

		if (!clusterSlugOrId) {
			const clusters = await clusterSvc.find({ workspace: this.workspace._id, ...restFilter });
			const ls = await Promise.all(
				clusters.map(async (cluster) => {
					const { contextName: context, isVerified } = cluster;
					if (!context || isVerified === false) return [] as KubeNode[];
					// authenticate cluster
					try {
						await ClusterManager.authCluster(cluster, { ownership: this.ownership, shouldSwitchContextToThisCluster: false });
					} catch (e) {
						console.error(`[ERROR] MonitorController > getNodes() :>>`, e);
						return [] as KubeNode[];
					}
					// fetch list
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
			const cluster = await clusterSvc.findOne({
				$or: [{ slug: clusterSlugOrId }, { _id: clusterSlugOrId }],
				workspace: this.workspace._id,
				...restFilter,
			});
			if (!cluster) return respondFailure(`Cluster "${clusterSlugOrId}" not found.`);

			const { contextName: context, isVerified } = cluster;
			if (!context || isVerified === false) return respondFailure(`Unverified cluster: "${clusterSlugOrId}"`);

			// authenticate cluster
			try {
				await ClusterManager.authCluster(cluster, { ownership: this.ownership, shouldSwitchContextToThisCluster: false });
			} catch (e) {
				console.error(`[ERROR] MonitorController > getNodes() :>>`, e);
				return [] as KubeNode[];
			}

			// fetch list
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
	async getNamespaces(@Queries() queryParams?: MonitoringNamespaceQueryFilter) {
		const { MonitorNamespaceService } = await import("@/services/MonitorService");
		const nsSvc = new MonitorNamespaceService(this.ownership);
		const data = await nsSvc.find(this.filter, this.options);

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of all resources of a namespace in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/namespaces/all")
	async allNamespaceResources(@Queries() queryParams?: MonitoringNamespaceQueryFilter) {
		const { MonitorNamespaceService } = await import("@/services/MonitorService");
		const nsSvc = new MonitorNamespaceService(this.ownership);
		const data = await nsSvc.allResources(this.filter, this.options);
		// process
		return respondSuccess({ data });

		// return respondSuccess({ data: 1 });
	}

	/**
	 * Create namespace in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/namespaces")
	async createNamespace(@Body() body?: MonitorNamespaceCreateData) {
		const { MonitorNamespaceService } = await import("@/services/MonitorService");
		const nsSvc = new MonitorNamespaceService(this.ownership);
		const data = await nsSvc.create(body);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Create namespace in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/namespaces")
	async deleteNamespace(@Body() body?: MonitoringQueryOptions, @Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorNamespaceService } = await import("@/services/MonitorService");
		const nsSvc = new MonitorNamespaceService(this.ownership);
		const data = await nsSvc.delete({ ...this.filter, ...body });

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S services
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/services")
	async getServices(@Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorServiceService } = await import("@/services/MonitorService");
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
		queryParams?: MonitoringQueryParams
	) {
		const { MonitorServiceService } = await import("@/services/MonitorService");
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
	async deleteService(@Body() body?: MonitoringQueryOptions, @Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorServiceService } = await import("@/services/MonitorService");
		const serviceSvc = new MonitorServiceService(this.ownership);
		const data = await serviceSvc.delete({ ...this.filter, ...body });

		return respondSuccess({ data });
	}

	/**
	 * List of K8S Ingress
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/ingresses")
	async getIngresses(@Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorIngressService } = await import("@/services/MonitorService");
		const ingressSvc = new MonitorIngressService(this.ownership);
		const data = await ingressSvc.find(this.filter, this.options);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Delete K8S Ingress
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/ingresses")
	async deleteIngresses(@Body() body?: MonitoringQueryOptions, @Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorIngressService } = await import("@/services/MonitorService");
		const ingressSvc = new MonitorIngressService(this.ownership);
		const data = await ingressSvc.delete({ ...this.filter, ...body });

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S Deployment
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/deployments")
	async getDeploys(@Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorDeploymentService } = await import("@/services/MonitorService");
		const deploymentSvc = new MonitorDeploymentService(this.ownership);
		const data = await deploymentSvc.find(this.filter, this.options);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Delete K8S Deployment
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/deployments")
	async deleteDeploys(@Body() body?: MonitoringQueryOptions, @Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorDeploymentService } = await import("@/services/MonitorService");
		const deploymentSvc = new MonitorDeploymentService(this.ownership);
		const data = await deploymentSvc.delete({ ...this.filter, ...body });

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S StatefulSet
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/statefulsets")
	async getStatefulSets(@Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorStatefulSetService } = await import("@/services/MonitorService");
		const statefulSetSvc = new MonitorStatefulSetService(this.ownership);
		const data = await statefulSetSvc.find(this.filter, this.options);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Delete K8S StatefulSet
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/statefulsets")
	async deleteStatefulSets(@Body() body?: MonitoringQueryOptions, @Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorStatefulSetService } = await import("@/services/MonitorService");
		const statefulSetSvc = new MonitorStatefulSetService(this.ownership);
		const data = await statefulSetSvc.delete({ ...this.filter, ...body });

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S Pod
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/pods")
	async getPods(@Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorPodService } = await import("@/services/MonitorService");
		const podSvc = new MonitorPodService(this.ownership);
		const data = await podSvc.find(this.filter, this.options);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Delete K8S Pod
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/pods")
	async deletePods(@Body() body?: MonitoringQueryOptions, @Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorPodService } = await import("@/services/MonitorService");
		const podSvc = new MonitorPodService(this.ownership);
		const data = await podSvc.delete({ ...this.filter, ...body });

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S Secret
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/secrets")
	async getSecrets(@Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorSecretService } = await import("@/services/MonitorService");
		const secretSvc = new MonitorSecretService(this.ownership);
		const data = await secretSvc.find(this.filter, this.options);

		// process
		return respondSuccess({ data });
	}

	/**
	 * Delete K8S Secret
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/secrets")
	async deleteSecrets(@Body() body?: MonitoringQueryOptions, @Queries() queryParams?: MonitoringQueryParams) {
		const { MonitorSecretService } = await import("@/services/MonitorService");
		const secretSvc = new MonitorSecretService(this.ownership);
		const data = await secretSvc.delete({ ...this.filter, ...body });

		// process
		return respondSuccess({ data });
	}
}
