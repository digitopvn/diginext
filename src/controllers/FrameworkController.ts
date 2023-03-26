import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { Framework } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import FrameworkService from "@/services/FrameworkService";

import BaseController from "./BaseController";

@Tags("Framework")
@Route("framework")
export default class FrameworkController extends BaseController<Framework> {
	constructor() {
		super(new FrameworkService());
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
	create(@Body() body: Omit<Framework, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<Framework, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
