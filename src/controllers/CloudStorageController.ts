import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ICloudStorage } from "@/entities";
import { type HiddenBodyKeys, type IPostQueryParams, IDeleteQueryParams, IGetQueryParams, respondFailure } from "@/interfaces";
import { CloudStorageService } from "@/services/CloudStorageService";

import BaseController from "./BaseController";

@Tags("CloudStorage")
@Route("storage")
export default class CloudStorageController extends BaseController<ICloudStorage> {
	service: CloudStorageService;

	constructor() {
		super(new CloudStorageService());
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: Omit<ICloudStorage, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		try {
			return await super.create(body);
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<ICloudStorage, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
