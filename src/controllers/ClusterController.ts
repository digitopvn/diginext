import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ICluster } from "@/entities";
import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import ClusterManager from "@/modules/k8s";
import { CloudProviderService, ClusterService } from "@/services";

import BaseController from "./BaseController";

@Tags("Cluster")
@Route("cluster")
export default class ClusterController extends BaseController<ICluster, ClusterService> {
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
		if (typeof body.isVerified === "undefined") body.isVerified = false;

		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		// validate cloud provider...
		const cloudProviderSvc = new CloudProviderService();
		const cloudProvider = await cloudProviderSvc.findOne({ _id: body.provider });
		if (!cloudProvider) return respondFailure(`Cloud Provider "${body.provider}" not found.`);
		body.providerShortName = cloudProvider.shortName;

		// validation - round 2
		errors = [];
		if (cloudProvider.shortName === "gcloud") {
			if (!body.shortName)
				errors.push(`GKE cluster name is required (Learn more: https://cloud.google.com/kubernetes-engine/docs/how-to/managing-clusters).`);

			if (!body.serviceAccount) errors.push(`Google Service Account (JSON) is required.`);
			// if (!body.region) errors.push(`Google cluster region is required.`);
			if (!body.zone) errors.push(`Google cluster zone is required.`);
		}
		if (cloudProvider.shortName === "digitalocean") {
			if (!body.shortName)
				errors.push(
					`DOK cluster name is required (Learn more: https://docs.digitalocean.com/products/kubernetes/how-to/connect-to-cluster/).`
				);
			if (!body.apiAccessToken) errors.push(`Digital Ocean API Access Token is required.`);
			// if (!body.region) errors.push(`Digital Ocean cluster region is required.`);
		}
		if (cloudProvider.shortName === "custom") {
			if (!body.kubeConfig) errors.push(`Kube config data (YAML) is required.`);
		}
		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		// create new cluster
		let newCluster = await this.service.create(body);

		if (newCluster) {
			try {
				newCluster = await ClusterManager.authCluster(newCluster, { ownership: this.ownership });
				if (!newCluster) return respondFailure(`Failed to connect to the cluster, please double check your information.`);

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
		// find cluster to update
		let cluster = await this.service.findOne(this.filter, { ...this.options, populate: ["provider"] });

		// update to database
		cluster = await this.service.updateOne({ _id: cluster._id }, body);
		// console.log("[CLUSTER CONTROLLER] UPDATE > cluster :>> ", cluster);

		return respondSuccess({ data: cluster });
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	async delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		try {
			const data = await this.service.delete(this.filter, this.options);
			return data.ok ? respondSuccess({ data }) : respondFailure({ data });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	/**
	 * Verify this cluster accessibility, then switch the current context to this cluster
	 * - Similar to `/verify`
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/connect")
	async connect(@Queries() queryParams?: { _id: string; slug: string }) {
		let cluster = await this.service.findOne(this.filter, this.options);
		if (!cluster) return respondFailure(`Cluster not found.`);

		try {
			cluster = await this.service.authCluster(cluster, {
				isDebugging: this.options.isDebugging,
				shouldSwitchContextToThisCluster: true,
				ownership: this.ownership,
			});
			return respondSuccess({ data: cluster });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	/**
	 * Verify this cluster accessibility, **won't** switch the current context to this cluster
	 * - Similar to `/connect`
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/verify")
	async verify(@Queries() queryParams?: { _id: string; slug: string }) {
		let cluster = await this.service.findOne(this.filter, this.options);
		if (!cluster) return respondFailure(`Cluster not found.`);

		try {
			// verify but won't
			cluster = await this.service.authCluster(cluster, {
				isDebugging: this.options.isDebugging,
				shouldSwitchContextToThisCluster: false,
				ownership: this.ownership,
			});
			return respondSuccess({ data: cluster });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}
}
