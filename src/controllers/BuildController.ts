import * as fs from "fs";
import path from "path";
import { Body, Delete, Get, Patch, Post, Queries, Route, Tags } from "tsoa/dist";

import { CLI_DIR } from "@/config/const";
import type { Build } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { stopBuild } from "@/modules/build";
import BuildService from "@/services/BuildService";

import BaseController from "./BaseController";

@Tags("Build")
@Route("build")
export default class BuildController extends BaseController<Build> {
	constructor() {
		super(new BuildService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<Build, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<Build, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Get("/logs")
	async getLogs(@Queries() queryParams?: { slug: string }) {
		let result: ResponseData & { data: string } = { status: 1, data: "", messages: [] };
		const { slug } = this.filter;

		// validation
		if (!slug) {
			result.status = 0;
			result.messages.push("slug is required.");
			return result;
		}

		// Attempt [1]: get logs from the database
		const build = await this.service.findOne({ slug });
		if (build) {
			const logContent = build.logs;
			if (logContent) {
				result.data = logContent;
				return result;
			}
		}

		// Attempt [2]: get logs from files
		const LOG_DIR = process.env.LOG_DIR ? path.resolve(process.env.LOG_DIR, `${slug}.txt`) : path.resolve(CLI_DIR, `public/logs/${slug}.txt`);
		const logs = fs.existsSync(LOG_DIR) ? fs.readFileSync(LOG_DIR, "utf8") : "No data.";

		result.data = logs;
		return result;
	}

	@Patch("/stop")
	async stopBuild(@Body() body: { slug: string }) {
		let result: ResponseData & { data: Build } = { status: 1, data: [], messages: [] };
		const { slug } = body;
		console.log("slug :>> ", slug);
		// return ApiResponse.failed(res, `${slug}`);

		if (!slug) {
			result.status = 0;
			result.messages.push(`Build "slug" is required.`);
			return result;
		}

		const build = await this.service.findOne({ slug });
		if (!build) {
			result.status = 0;
			result.messages.push(`Build "${slug}" not found.`);
			return result;
		}

		const stoppedBuild = await stopBuild(build.appSlug, slug.toString());
		if ((stoppedBuild as { error: string }).error) {
			result.status = 0;
			result.messages.push((stoppedBuild as { error: string }).error);
			return result;
		}

		result.data = stoppedBuild;
		return result;
	}
}
