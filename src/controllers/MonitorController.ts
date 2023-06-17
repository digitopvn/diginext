import { Body, Get, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ICluster } from "@/entities";
import type { KubeNamespace, KubeService } from "@/interfaces";
import { respondFailure, respondSuccess } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import ClusterManager from "@/modules/k8s";
import { MongoDB } from "@/plugins/mongodb";

import BaseController from "./BaseController";

@Tags("Monitor")
@Route("monitor")
export default class MonitorController extends BaseController {
	/**
	 * List of namespaces in a cluster
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/namespaces")
	async getNamespaces(@Queries() queryParams?: { clusterShortName: string }) {
		let { clusterShortName } = this.filter;

		let data: KubeNamespace[] = [];

		if (!clusterShortName) {
			const clusters = await DB.find<ICluster>("cluster", { workspace: this.workspace._id });
			const ls = await Promise.all(
				clusters.map(async (cluster) => {
					const { contextName: context } = cluster;
					if (!context) return [] as KubeNamespace[];
					let nsList = await ClusterManager.getAllNamespaces({ context });
					nsList = nsList.map((ns) => {
						ns.workspace = MongoDB.toString(this.workspace._id);
						ns.clusterShortName = cluster.shortName;
						ns.cluster = MongoDB.toString(cluster._id);
						return ns;
					});
					return nsList;
				})
			);
			ls.map((nsList) => nsList.map((ns) => data.push(ns)));
		} else {
			const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: this.workspace._id });
			if (!cluster) return respondFailure(`Cluster "${clusterShortName}" not found.`);

			const { contextName: context } = cluster;
			if (!context) return respondFailure(`Unverified cluster: "${clusterShortName}"`);

			data = await ClusterManager.getAllNamespaces({ context });
			data = data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterShortName = cluster.shortName;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			});
		}

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
		@Queries() queryParams?: { clusterShortName: string }
	) {
		const { clusterShortName } = this.filter;
		const { name } = body;

		if (!clusterShortName) return respondFailure(`Param "clusterShortName" is required.`);

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: this.workspace._id });
		if (!cluster) return respondFailure(`Cluster "${clusterShortName}" not found.`);

		const { contextName: context } = cluster;
		if (!context) return respondFailure(`Unverified cluster: "${clusterShortName}"`);

		// check name existed
		const isExisted = await ClusterManager.isNamespaceExisted(name);
		if (isExisted) return respondFailure(`Namespace "${name}" is existed.`);

		const data = await ClusterManager.createNamespace(name, { context });

		// data.workspace = MongoDB.toString(this.workspace._id);
		// data.clusterShortName = clusterShortName;
		// data.cluster = MongoDB.toString(cluster._id);

		// process
		return respondSuccess({ data });
	}

	/**
	 * List of K8S services
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/services")
	async getServices(@Queries() queryParams?: { clusterShortName: string; namespace?: string }) {
		const { namespace, clusterShortName } = this.filter;

		if (!clusterShortName) return respondFailure(`Param "clusterShortName" is required.`);

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: this.workspace._id });
		if (!cluster) return respondFailure(`Cluster "${clusterShortName}" not found.`);

		const { contextName: context } = cluster;
		if (!context) return respondFailure(`Unverified cluster: "${clusterShortName}"`);

		const data = namespace ? await ClusterManager.getServices(namespace, { context }) : await ClusterManager.getAllServices({ context });

		// process
		return respondSuccess({
			data: data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterShortName = clusterShortName;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			}),
		});
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
			clusterShortName: string;
		}
	) {
		const { clusterShortName, namespace = "default" } = this.filter;
		const { name } = body;

		if (!clusterShortName) return respondFailure(`Param "clusterShortName" is required.`);

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: this.workspace._id });
		if (!cluster) return respondFailure(`Cluster "${clusterShortName}" not found.`);

		const { contextName: context } = cluster;
		if (!context) return respondFailure(`Unverified cluster: "${clusterShortName}"`);

		// check name existed
		const isExisted = await ClusterManager.isNamespaceExisted(name);
		if (!isExisted) return respondFailure(`Namespace "${name}" not found.`);

		// const data = await ClusterManager.createNamespace(name, { context });
		return respondFailure("This feature is in processed.");
	}

	/**
	 * List of K8S Ingress
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/ingresses")
	async getIngresses(@Queries() queryParams?: { clusterShortName: string; namespace?: string }) {
		const { namespace, clusterShortName } = this.filter;

		if (!clusterShortName) return respondFailure(`Param "clusterShortName" is required.`);

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: this.workspace._id });
		if (!cluster) return respondFailure(`Cluster "${clusterShortName}" not found.`);

		const { contextName: context } = cluster;
		if (!context) return respondFailure(`Unverified cluster: "${clusterShortName}"`);

		const data = namespace ? await ClusterManager.getIngresses(namespace, { context }) : await ClusterManager.getAllIngresses({ context });

		// process
		return respondSuccess({
			data: data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterShortName = clusterShortName;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			}),
		});
	}

	/**
	 * List of K8S Deployment
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/deployments")
	async getDeploys(@Queries() queryParams?: { clusterShortName: string; namespace?: string }) {
		const { namespace, clusterShortName } = this.filter;

		if (!clusterShortName) return respondFailure(`Param "clusterShortName" is required.`);

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: this.workspace._id });
		if (!cluster) return respondFailure(`Cluster "${clusterShortName}" not found.`);

		const { contextName: context } = cluster;
		if (!context) return respondFailure(`Unverified cluster: "${clusterShortName}"`);

		const data = namespace ? await ClusterManager.getDeploys(namespace, { context }) : await ClusterManager.getAllDeploys({ context });

		// process
		return respondSuccess({
			data: data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterShortName = clusterShortName;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			}),
		});
	}

	/**
	 * List of K8S Pod
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/pods")
	async getPods(@Queries() queryParams?: { clusterShortName: string; namespace?: string }) {
		const { namespace, clusterShortName } = this.filter;

		if (!clusterShortName) return respondFailure(`Param "clusterShortName" is required.`);

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: this.workspace._id });
		if (!cluster) return respondFailure(`Cluster "${clusterShortName}" not found.`);

		const { contextName: context } = cluster;
		if (!context) return respondFailure(`Unverified cluster: "${clusterShortName}"`);

		const data = namespace ? await ClusterManager.getPods(namespace, { context }) : await ClusterManager.getAllPods({ context });

		// process
		return respondSuccess({
			data: data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterShortName = clusterShortName;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			}),
		});
	}

	/**
	 * List of K8S Secret
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/secrets")
	async getSecrets(@Queries() queryParams?: { clusterShortName: string; namespace?: string }) {
		const { namespace, clusterShortName } = this.filter;

		if (!clusterShortName) return respondFailure(`Param "clusterShortName" is required.`);

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName, workspace: this.workspace._id });
		if (!cluster) return respondFailure(`Cluster "${clusterShortName}" not found.`);

		const { contextName: context } = cluster;
		if (!context) return respondFailure(`Unverified cluster: "${clusterShortName}"`);

		const data = namespace ? await ClusterManager.getSecrets(namespace, { context }) : await ClusterManager.getAllSecrets({ context });

		// process
		return respondSuccess({
			data: data.map((ns) => {
				ns.workspace = MongoDB.toString(this.workspace._id);
				ns.clusterShortName = clusterShortName;
				ns.cluster = MongoDB.toString(cluster._id);
				return ns;
			}),
		});
	}
}