import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "@tsoa/runtime";

import type { IBuild } from "@/entities";
import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import * as buildModule from "@/modules/build";
import { Logger } from "@/plugins";
import { BuildService } from "@/services";

import BaseController from "./BaseController";

@Tags("Build")
@Route("build")
export default class BuildController extends BaseController<IBuild, BuildService> {
	constructor() {
		super(new BuildService());
	}

	/**
	 * List of builds
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
	create(@Body() body: entities.BuildDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: entities.BuildDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/logs")
	async getLogs(@Queries() queryParams?: { slug: string }) {
		const { slug } = this.filter;

		// validation
		if (!slug) return respondFailure("Build's slug is required.");

		// Get logs from the database
		const build = await this.service.findOne({ slug });
		if (build?.logs) return respondSuccess({ data: build?.logs });

		// if no logs in database -> try to fetch in local storage:
		const logs = Logger.getLogs(slug) || "No data.";
		return respondSuccess({ data: logs });
	}

	/**
	 * Check status then build container image finish.
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/status")
	async getStatus(@Queries() queryParams?: { slug: string }) {
		const { slug } = this.filter;

		// validation
		if (!slug) return respondFailure("Build's slug is required.");

		// Attempt [1]: get logs from the database
		const build = await this.service.findOne({ slug });
		if (typeof build?.status !== "undefined") return respondSuccess({ data: build?.status });

		return respondFailure("Unable to get build's status.");
	}

	/**
	 * Create a new {Build} instance, then start building container image.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/start")
	async startBuild(@Body() body: buildModule.StartBuildParams) {
		try {
			const buildInfo = await this.service.startBuild(body, this.ownership);
			return respondSuccess({ data: buildInfo, msg: `Building...` });
		} catch (e) {
			return respondFailure(`Unable to start the build process: ${e}`);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/stop")
	async stopBuild(@Body() body: { slug: string }) {
		try {
			const build = await this.service.stopBuild(body.slug, this.ownership);
			return respondSuccess({ data: build });
		} catch (e) {
			return respondFailure(`Unable to stop the build process: ${e}`);
		}
	}

	/**
	 * Create a new {Build} instance, then start building container image.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/rerun")
	async rerunBuild(
		@Body() body: buildModule.RerunBuildParams,
		@Queries()
		queryParams?: {
			/**
			 * Build's slug
			 */
			slug: string;
			/**
			 * Build's ID
			 */
			_id: string;
		}
	) {
		console.log("rerunBuild() > this.filter :>> ", this.filter);
		// validates
		const build = await this.service.findOne({ $or: [{ _id: this.filter._id }, { slug: this.filter.slug }], workspace: this.workspace._id });
		if (!build) return respondFailure(`Unable to rerun building: Build not found.`);

		// rerun the build
		try {
			const buildInfo = await this.service.rerunBuild(build, { ...body }, this.ownership);
			return respondSuccess({ data: buildInfo, msg: `Building...` });
		} catch (e) {
			return respondFailure(`Unable to re-run the build: ${e}`);
		}
	}
}
