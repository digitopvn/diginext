import { isNotIn } from "class-validator";
import { logError } from "diginext-utils/dist/console/log";
import { unlink } from "fs";
import { isEmpty } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ContainerRegistry } from "@/entities";
import type { HiddenBodyKeys, ResponseData } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import { registryProviderList } from "@/interfaces/SystemTypes";
import { DB } from "@/modules/api/DB";
import digitalocean from "@/modules/providers/digitalocean";
import gcloud from "@/modules/providers/gcloud";
import { connectRegistry } from "@/modules/registry/connect-registry";
import { createTmpFile } from "@/plugins";
import ContainerRegistryService from "@/services/ContainerRegistryService";

import BaseController from "./BaseController";

type MaskedContainerRegistry = Omit<ContainerRegistry, keyof HiddenBodyKeys>;

@Tags("Container Registry")
@Route("registry")
export default class ContainerRegistryController extends BaseController<ContainerRegistry> {
	constructor() {
		super(new ContainerRegistryService());
	}

	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("jwt")
	@Post("/")
	async create(@Body() body: MaskedContainerRegistry, @Queries() queryParams?: IPostQueryParams) {
		const { name, serviceAccount, provider: providerShortName, host, imageBaseURL, apiAccessToken } = body;

		const errors: string[] = [];
		if (isEmpty(name)) errors.push(`Name is required.`);
		if (isEmpty(host)) errors.push(`Host is required (eg. us.gcr.io, hub.docker.com,...)`);
		if (isEmpty(imageBaseURL)) errors.push(`Base image URL is required (eg. asia.gcr.io/my-workspace)`);
		if (isEmpty(providerShortName)) errors.push(`Container registry provider is required (eg. gcloud, digitalocean, dockerhub,...)`);
		if (isNotIn(providerShortName, registryProviderList))
			errors.push(`Container registry provider should be one of [${registryProviderList.join(", ")}]`);

		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		if (providerShortName === "gcloud" && isEmpty(serviceAccount))
			return { status: 0, messages: [`Service Account (JSON) is required to authenticate Google Container Registry.`] } as ResponseData;

		if (providerShortName === "digitalocean" && isEmpty(apiAccessToken))
			return { status: 0, messages: [`API access token is required to authenticate DigitalOcean Container Registry.`] } as ResponseData;

		const newRegistryData = {
			name,
			provider: providerShortName,
			host,
			serviceAccount,
			imageBaseURL,
			apiAccessToken,
			isVerified: false,
		} as MaskedContainerRegistry;

		const newRegistry = await this.service.create(newRegistryData);

		// verify...
		let verifiedRegistry: ContainerRegistry;
		const authRes = await connectRegistry(newRegistry, { userId: this.user?._id, workspaceId: this.workspace?._id });
		if (authRes) [verifiedRegistry] = await DB.update<ContainerRegistry>("registry", { _id: newRegistry._id }, { isVerified: true });

		return { status: 1, data: isEmpty(verifiedRegistry) ? newRegistry : verifiedRegistry, messages: authRes ? [authRes] : [] } as ResponseData;
	}

	@Security("jwt")
	@Patch("/")
	async update(@Body() body: Omit<ContainerRegistry, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		const [updatedRegistry] = await DB.update<ContainerRegistry>("registry", this.filter, body);

		const { name, serviceAccount, provider: providerShortName, host, imageBaseURL, apiAccessToken } = updatedRegistry;

		const errors: string[] = [];
		if (isEmpty(name)) errors.push(`Name is required.`);
		if (isEmpty(host)) errors.push(`Host is required (eg. us.gcr.io, hub.docker.com,...)`);
		if (isEmpty(imageBaseURL)) errors.push(`Base image URL is required (eg. asia.gcr.io/my-workspace)`);
		if (isEmpty(providerShortName)) errors.push(`Container registry provider is required (eg. gcloud, digitalocean, dockerhub,...)`);
		if (isNotIn(providerShortName, registryProviderList))
			errors.push(`Container registry provider should be one of [${registryProviderList.join(", ")}]`);

		if (errors.length > 0) return { status: 0, messages: errors } as ResponseData;

		if (providerShortName === "gcloud" && isEmpty(serviceAccount))
			return { status: 0, messages: [`Service Account (JSON) is required to authenticate Google Container Registry.`] } as ResponseData;

		if (providerShortName === "digitalocean" && isEmpty(apiAccessToken))
			return { status: 0, messages: [`API access token is required to authenticate DigitalOcean Container Registry.`] } as ResponseData;

		// verify...
		let verifiedRegistry: ContainerRegistry;
		const authRes = await connectRegistry(updatedRegistry, { userId: this.user?._id, workspaceId: this.workspace?._id });
		[verifiedRegistry] = await DB.update<ContainerRegistry>("registry", { _id: updatedRegistry._id }, { isVerified: authRes ? true : false });

		return { status: 1, data: updatedRegistry, messages: authRes ? [authRes] : [] } as ResponseData;
	}

	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Security("jwt")
	@Get("/connect")
	async connect(@Queries() queryParams?: { slug: string }) {
		const result: { status: number; messages: string[]; data: any } = { status: 1, messages: [], data: {} };

		const options = { userId: this.user?._id.toString(), workspaceId: this.user?.activeWorkspace.toString() };
		// console.log("options :>> ", options);

		const { slug } = this.filter.query;
		if (!slug) {
			result.status = 0;
			result.messages = [`Param "slug" is required.`];
			return result;
		}

		const registry = await this.service.findOne({ slug });
		if (!registry) {
			result.status = 0;
			result.messages = [`Container Registry not found: ${slug}.`];
			return result;
		}
		// console.log("registry :>> ", registry);

		const { provider, host } = registry;
		switch (provider) {
			case "gcloud":
				const { serviceAccount } = registry;

				const tmpFilePath = createTmpFile(`gsa.json`, serviceAccount);

				const authResult = await gcloud.authenticate({ filePath: tmpFilePath, host, ...options });
				// console.log("authResult :>> ", authResult);
				if (authResult) {
					result.status = 1;
					result.messages = ["Ok"];
				} else {
					result.status = 0;
					result.messages = [`Google Cloud Container Registry authentication failed.`];
				}

				// delete temporary service account
				unlink(tmpFilePath, (err) => logError(err));

				return result;

			case "digitalocean":
				const { apiAccessToken } = registry;
				const doResult = await digitalocean.authenticate({ key: apiAccessToken, ...options });
				if (doResult) {
					result.status = 1;
					result.messages = ["Ok"];
				} else {
					result.status = 0;
					result.messages = [`Digital Ocean Container Registry authentication failed.`];
				}
				return result;

			default:
				result.status = 0;
				result.messages = [`This container registry is not supported (${provider}), only "gcloud" and "digitalocean" are supported.`];
				return result;
		}
	}
}
