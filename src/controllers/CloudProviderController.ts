import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import { CloudProviderService } from "@/services/CloudProviderService";

import BaseController from "./BaseController";

@Tags("Cloud Provider")
@Route("provider")
export default class CloudProviderController extends BaseController {
	constructor() {
		super(new CloudProviderService());
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		if (this.filter && this.filter.owner) delete this.filter.owner;
		if (this.filter && this.filter.workspace) delete this.filter.workspace;
		// console.log("this.filter :>> ", this.filter);
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: entities.CloudProviderDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		if (this.filter && this.filter.owner) delete this.filter.owner;
		if (this.filter && this.filter.workspace) delete this.filter.workspace;
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: entities.CloudProviderDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		if (this.filter && this.filter.owner) delete this.filter.owner;
		if (this.filter && this.filter.workspace) delete this.filter.workspace;
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		if (this.filter && this.filter.owner) delete this.filter.owner;
		if (this.filter && this.filter.workspace) delete this.filter.workspace;
		return super.delete();
	}
}
