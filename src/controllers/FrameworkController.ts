import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IFramework } from "@/entities";
import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
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
	read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: entities.FrameworkDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: entities.FrameworkDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}
}
