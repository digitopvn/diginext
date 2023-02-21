import * as fs from "fs";
import path from "path";
import { Body, Delete, Get, Patch, Post, Queries, Route, Tags } from "tsoa/dist";

import type { ContainerRegistry, Project } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import digitalocean from "@/modules/providers/digitalocean";
import gcloud from "@/modules/providers/gcloud";
import ContainerRegistryService from "@/services/ContainerRegistryService";

import BaseController from "./BaseController";

@Tags("Container Registry")
@Route("registry")
export default class ContainerRegistryController extends BaseController<ContainerRegistry> {
	constructor() {
		super(new ContainerRegistryService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<Project, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<Project, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

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

				const tmpDir = path.resolve(process.env.STORAGE, `registry`);
				if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

				const tmpFilePath = path.resolve(tmpDir, `gcloud-service-account.json`);
				fs.writeFileSync(tmpFilePath, serviceAccount, "utf8");

				const authResult = await gcloud.authenticate({ filePath: tmpFilePath, host, ...options });
				// console.log("authResult :>> ", authResult);
				if (authResult) {
					result.status = 1;
					result.messages = ["Ok"];
				} else {
					result.status = 0;
					result.messages = [`Google Cloud Container Registry authentication failed.`];
				}
				return result;
				break;

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
				break;

			default:
				result.status = 0;
				result.messages = [`This container registry is not supported (${provider}), only "gcloud" and "digitalocean" are supported.`];
				return result;
				break;
		}
	}
}
