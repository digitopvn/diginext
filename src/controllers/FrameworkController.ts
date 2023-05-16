import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IFramework } from "@/entities";
import { FrameworkDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import FrameworkService from "@/services/FrameworkService";

import BaseController from "./BaseController";

@Tags("Framework")
@Route("framework")
export default class FrameworkController extends BaseController<IFramework> {
	constructor() {
		super(new FrameworkService());
	}

	/**
	 * List of frameworks
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: FrameworkDto, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: FrameworkDto, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
