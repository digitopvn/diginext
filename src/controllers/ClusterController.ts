import { logError } from "diginext-utils/dist/xconsole/log";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ICloudProvider, ICluster } from "@/entities";
import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import ClusterManager from "@/modules/k8s";
import { CloudProviderService } from "@/services";
import ClusterService from "@/services/ClusterService";

import BaseController from "./BaseController";

@Tags("Cluster")
@Route("cluster")
export default class ClusterController extends BaseController {
	constructor() {
		super(new ClusterService());
	}

	/**
	 * List of K8S clusters
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: entities.ClusterDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		// validation - round 1
		let errors: string[] = [];
		if (!body.provider) errors.push(`Cloud Provider ID is required.`);
		if (!body.shortName) errors.push(`Cluster short name is required, find it on your cloud provider dashboard.`);
		if (typeof body.isVerified === "undefined") body.isVerified = false;

		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		// check duplication
		const existingShortName = await this.service.findOne({ shortName: body.shortName, workspace: this.workspace._id });
		if (existingShortName) return respondFailure(`Cluster with short name "${body.shortName}" is existed, please use different short name.`);

		// validate cloud provider...
		const cloudProviderSvc = new CloudProviderService();

		const cloudProvider = await cloudProviderSvc.findOne({ _id: body.provider });
		if (!cloudProvider) return respondFailure(`Cloud Provider "${body.provider}" not found.`);

		body.providerShortName = cloudProvider.shortName;

		// validation - round 2
		errors = [];
		if (cloudProvider.shortName === "gcloud") {
			if (!body.serviceAccount) errors.push(`Google Service Account (JSON) is required.`);
			if (!body.projectID) errors.push(`Google Project ID is required.`);
			if (!body.region) errors.push(`Google cluster region is required.`);
			if (!body.zone) errors.push(`Google cluster zone is required.`);
		}
		if (cloudProvider.shortName === "digitalocean") {
			if (!body.apiAccessToken) errors.push(`Digital Ocean API Access Token is required.`);
			// if (!body.region) errors.push(`Digital Ocean cluster region is required.`);
		}
		if (cloudProvider.shortName === "custom") {
			if (!body.kubeConfig) errors.push(`Kube config data (YAML) is required.`);
		}
		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		// create new cluster
		let newCluster = (await this.service.create(body)) as ICluster;

		if (newCluster) {
			try {
				const auth = await ClusterManager.authCluster(newCluster);
				if (!auth) return respondFailure(`Failed to connect to the cluster, please double check your information.`);

				return respondSuccess({ data: newCluster });
			} catch (e) {
				return respondFailure(`Failed to connect to the cluster: ${e}`);
			}
		} else {
			return respondFailure(`Unable to create new cluster (internal server error).`);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: entities.ClusterDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		const cloudProviderSvc = new CloudProviderService();
		let cloudProvider: ICloudProvider;

		// validation - round 1: valid input params
		if (body.provider) {
			cloudProvider = await cloudProviderSvc.findOne({ _id: body.provider });
			if (!cloudProvider) return { status: 0, messages: [`Cloud Provider "${body.provider}" not found.`] } as ResponseData;
		}

		let cluster = await this.service.findOne(this.filter);
		if (!cluster) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Cluster not found.` });

		// validate cloud provider...
		if (!cloudProvider) cloudProvider = await cloudProviderSvc.findOne({ _id: body.provider });
		if (!cloudProvider) return { status: 0, messages: [`Cloud Provider is not valid.`] } as ResponseData;

		const updateData = { ...body, provider: body.provider, providerShortName: cloudProvider.shortName } as entities.ClusterDto;
		[cluster] = await this.service.update({ _id: cluster._id }, updateData);
		// console.log("cluster :>> ", cluster);

		// validation - round 2: check cluster accessibility
		let errors: string[] = [];
		if (cloudProvider.shortName === "gcloud") {
			if (!cluster.serviceAccount && !body.serviceAccount) errors.push(`Google Service Account (JSON) is required.`);
			if (!cluster.projectID && !body.projectID) errors.push(`Google Project ID is required.`);
			if (!cluster.region && !body.region) errors.push(`Google cluster region is required.`);
			if (!cluster.zone && !body.zone) errors.push(`Google cluster zone is required.`);
		}
		if (cloudProvider.shortName === "digitalocean") {
			if (!cluster.apiAccessToken) errors.push(`Digital Ocean API Access Token is required.`);
			// if (!cluster.region && !body.region) errors.push(`Digital Ocean cluster region is required.`);
		}
		if (cloudProvider.shortName === "custom") {
			if (!cluster.kubeConfig && !body.kubeConfig) errors.push(`Kube config data (YAML) is required.`);
		}
		if (errors.length > 0) return respondFailure(errors);

		// verify...
		try {
			await ClusterManager.authCluster(cluster.shortName);
			[cluster] = await this.service.update({ _id: cluster._id }, { isVerified: true });

			/**
			 * Check for required stack installations, if not install them:
			 */

			// [1] NGINX Ingress
			await ClusterManager.installNginxIngressStack(cluster);
			// [2] Cert Manager
			await ClusterManager.installCertManagerStack(cluster);
		} catch (e) {
			console.log("Failed to connect cluster :>> ", e);
			return respondFailure(`Failed to connect to the cluster, please double check your information.`);
		}

		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/connect")
	async connect(@Queries() queryParams?: { slug: string }) {
		const result: ResponseData = { status: 1, messages: [], data: {} };

		const { slug } = this.filter;
		if (!slug) {
			result.status = 0;
			result.messages.push(`Param "slug" is required.`);
			return result;
		}

		const cluster = await this.service.findOne({ slug });
		if (!cluster) {
			result.status = 0;
			result.messages.push(`Cluster not found: ${slug}.`);
			return result;
		}
		// console.log("registry :>> ", registry);

		const { shortName } = cluster;
		try {
			const authResult = await ClusterManager.authCluster(shortName);
			if (authResult) {
				result.status = 1;
				result.messages.push("Ok");
			} else {
				result.status = 0;
				result.messages.push(`Cluster authentication failed.`);
			}
		} catch (e) {
			logError(`[CLUSTER AUTH]`, e);
			result.status = 0;
			result.messages.push(`Cluster authentication failed: ${e}`);
		}
		return result;
	}
}
