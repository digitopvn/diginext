import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import { FrameworkService } from "@/services/FrameworkService";

import BaseController from "./BaseController";

@Tags("Framework")
@Route("framework")
export default class FrameworkController extends BaseController {
	service: FrameworkService;

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
	async create(@Body() body: entities.FrameworkDto) {
		try {
			this.service.req = this.req;
			const data = await this.service.create(body, { ...this.options });
			return interfaces.respondSuccess({ data });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
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
