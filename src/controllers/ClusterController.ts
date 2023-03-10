import { logError } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";
import { ObjectId } from "mongodb";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { Cluster } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import ClusterManager from "@/modules/k8s";
import { CloudProviderService } from "@/services";
import ClusterService from "@/services/ClusterService";

import BaseController from "./BaseController";

@Tags("Cluster")
@Route("cluster")
export default class ClusterController extends BaseController<Cluster> {
	constructor() {
		super(new ClusterService());
	}

	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("jwt")
	@Post("/")
	async create(@Body() body: Omit<Cluster, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		// validation - round 1
		let errors: string[] = [];
		if (isEmpty(body.provider)) errors.push(`Cloud Provider ID is required.`);
		if (isEmpty(body.shortName)) errors.push(`Cluster short name is required, find it on your cloud provider dashboard.`);

		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		// validate cloud provider...
		const cloudProviderSvc = new CloudProviderService();

		const cloudProvider = await cloudProviderSvc.findOne({ _id: new ObjectId(body.provider as string) });
		if (!cloudProvider) return { status: 0, messages: [`Cloud Provider "${body.provider}" not found.`] } as ResponseData;

		body.providerShortName = cloudProvider.shortName;
		body.isVerified = false;

		// validation - round 2
		errors = [];
		if (cloudProvider.shortName === "gcloud") {
			if (isEmpty(body.serviceAccount)) errors.push(`Google Service Account (JSON) is required.`);
			if (isEmpty(body.projectID)) errors.push(`Google Project ID is required.`);
			if (isEmpty(body.region)) errors.push(`Google cluster region is required.`);
			if (isEmpty(body.zone)) errors.push(`Google cluster zone is required.`);
		}
		if (cloudProvider.shortName === "digitalocean") {
			if (isEmpty(body.apiAccessToken)) errors.push(`Digital Ocean API Access Token is required.`);
			if (isEmpty(body.region)) errors.push(`Digital Ocean cluster region is required.`);
		}
		if (cloudProvider.shortName === "custom") {
			if (isEmpty(body.kubeConfig)) errors.push(`Kube config data (YAML) is required.`);
		}
		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		// create new cluster
		let newCluster = (await this.service.create(body)) as Cluster;

		if (newCluster) {
			try {
				const auth = await ClusterManager.authCluster(newCluster.shortName);
				if (!auth) {
					return { status: 0, messages: [`Failed to connect to the cluster, please double check your information.`] } as ResponseData;
				}

				[newCluster] = await this.service.update({ _id: newCluster._id }, { isVerified: true });

				return { status: 1, data: newCluster } as ResponseData;
			} catch (e) {
				return { status: 0, messages: [`Failed to connect to the cluster: ${e}`] } as ResponseData;
			}
		} else {
			return { status: 0, messages: [`Can't create new cluster`] } as ResponseData;
		}
	}

	@Security("jwt")
	@Patch("/")
	async update(@Body() body: Omit<Cluster, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		if (body.provider) {
			const cloudProviderSvc = new CloudProviderService();

			const cloudProvider = await cloudProviderSvc.findOne({ _id: new ObjectId(body.provider as string) });
			if (!cloudProvider) return { status: 0, messages: [`Cloud Provider "${body.provider}" not found.`] } as ResponseData;

			body.providerShortName = cloudProvider.shortName;
		}

		let cluster = await this.service.findOne(this.filter);

		// validation - round 1
		let errors: string[] = [];
		if (isEmpty(cluster.provider)) errors.push(`Cloud Provider ID is required.`);
		if (isEmpty(cluster.shortName)) errors.push(`Cluster short name is required, find it on your cloud provider dashboard.`);

		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		// validate cloud provider...
		const cloudProviderSvc = new CloudProviderService();

		const cloudProvider = await cloudProviderSvc.findOne({ _id: new ObjectId(cluster.provider as string) });
		if (!cloudProvider) return { status: 0, messages: [`Cloud Provider "${cluster.provider}" not found.`] } as ResponseData;

		// validation - round 2
		errors = [];
		if (cloudProvider.shortName === "gcloud") {
			if (isEmpty(cluster.serviceAccount)) errors.push(`Google Service Account (JSON) is required.`);
			if (isEmpty(cluster.projectID)) errors.push(`Google Project ID is required.`);
			if (isEmpty(cluster.region)) errors.push(`Google cluster region is required.`);
			if (isEmpty(cluster.zone)) errors.push(`Google cluster zone is required.`);
		}
		if (cloudProvider.shortName === "digitalocean") {
			if (isEmpty(cluster.apiAccessToken)) errors.push(`Digital Ocean API Access Token is required.`);
			if (isEmpty(cluster.region)) errors.push(`Digital Ocean cluster region is required.`);
		}
		if (cloudProvider.shortName === "custom") {
			if (isEmpty(cluster.kubeConfig)) errors.push(`Kube config data (YAML) is required.`);
		}
		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		// verify...
		try {
			await ClusterManager.authCluster(cluster.shortName);

			[cluster] = await this.service.update({ _id: cluster._id }, { isVerified: true });
		} catch (e) {
			return { status: 0, messages: [`Failed to connect to the cluster, please double check your information.`] } as ResponseData;
		}

		return super.update(body);
	}

	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

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
			logError(e);
			result.status = 0;
			result.messages.push(`Cluster authentication failed: ${e}`);
		}
		return result;
	}
}
