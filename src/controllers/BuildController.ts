import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { Config } from "@/app.config";
import type { Build } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { startBuild, StartBuildParams, stopBuild } from "@/modules/build";
import { Logger } from "@/plugins";
import BuildService from "@/services/BuildService";

import BaseController from "./BaseController";

type BuildData = Omit<Build, keyof HiddenBodyKeys>;

@Tags("Build")
@Route("build")
export default class BuildController extends BaseController<Build> {
	constructor() {
		super(new BuildService());
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
	create(@Body() body: BuildData, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: BuildData, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
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
		// console.log("build :>> ", build);
		if (build) {
			const logContent = build.logs;
			if (logContent) {
				result.data = logContent;
				return result;
			}
		}

		// Attempt [2]: get logs from files
		// const LOG_DIR = process.env.LOG_DIR ?? path.resolve(CLI_DIR, `public/logs`);
		// const LOG_FILE_PATH = path.resolve(LOG_DIR, `${slug}.txt`);
		// console.log("LOG_FILE_PATH :>> ", LOG_FILE_PATH);
		// const logs = fs.existsSync(LOG_FILE_PATH) ? fs.readFileSync(LOG_FILE_PATH, "utf8") : "No data.";

		const logs = Logger.getLogs(slug) || "No data.";

		result.data = logs;
		return result;
	}

	/**
	 * Create a new {Build} instance, then start building container image.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/start")
	async startBuild(@Body() body: StartBuildParams) {
		// validate
		const { appSlug, buildNumber } = body;

		// start the build
		startBuild(body);

		const buildServerUrl = Config.BASE_URL;
		const SOCKET_ROOM = `${appSlug}-${buildNumber}`;
		const logURL = `${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM}`;

		return { status: 1, messages: [`Building...`], data: { logURL } } as ResponseData;
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/stop")
	async stopBuild(@Body() body: { slug: string }) {
		let result: ResponseData & { data: Build } = { status: 1, data: [], messages: [] };
		const { slug } = body;
		// console.log("slug :>> ", slug);
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

		const stoppedBuild = await stopBuild(build.projectSlug, build.appSlug, slug.toString());
		if ((stoppedBuild as { error: string }).error) {
			result.status = 0;
			result.messages.push((stoppedBuild as { error: string }).error);
			return result;
		}

		result.data = stoppedBuild;
		return result;
	}
}
