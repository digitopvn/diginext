import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { FrameworkDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
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
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: FrameworkDto) {
		try {
			this.service.req = this.req;
			const data = await this.service.create(body, { ...this.options });
			return respondSuccess({ data });
		} catch (e) {
			return respondFailure(e.toString());
		}
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

	/**
	 * List of trending repositories on Github
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/trends")
	async getGithubTrends(@Queries() queryParams?: IGetQueryParams) {
		try {
			const data = await this.service.getGithubTrends();
			return respondSuccess({ data });
		} catch (e) {
			return respondFailure(`Unable to get Github trending repositories: ${e}`);
		}
	}
}
