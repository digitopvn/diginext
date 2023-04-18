import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ICloudProvider } from "@/entities";
import { CloudProviderDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import CloudProviderService from "@/services/CloudProviderService";

import BaseController from "./BaseController";

@Tags("Cloud Provider")
@Route("provider")
export default class CloudProviderController extends BaseController<ICloudProvider> {
	constructor() {
		super(new CloudProviderService());
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
	create(@Body() body: CloudProviderDto, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: CloudProviderDto, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
