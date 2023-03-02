import { logError } from "diginext-utils/dist/console/log";
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
		const cloudProviderSvc = new CloudProviderService();

		const cloudProvider = await cloudProviderSvc.findOne({ _id: new ObjectId(body.provider as string) });
		if (!cloudProvider) return { status: 0, messages: [`Cloud Provider "${body.provider}" not found.`] } as ResponseData;

		body.providerShortName = cloudProvider.shortName;

		const auth = await ClusterManager.auth(body.shortName);
		if (!auth) return { status: 0, messages: [`Failed to connect to the cluster, please double check your information.`] } as ResponseData;

		return super.create(body);
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

		const cluster = await this.service.findOne(this.filter);

		try {
			await ClusterManager.auth(cluster.shortName);
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

		// const options = { userId: this.user?._id.toString(), workspaceId: this.user?.activeWorkspace.toString() };
		// console.log("options :>> ", options);

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
			const authResult = await ClusterManager.auth(shortName);
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
