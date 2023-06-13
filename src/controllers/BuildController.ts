import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "@tsoa/runtime";

import { Config } from "@/app.config";
import type { IBuild } from "@/entities";
import { BuildDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import { startBuild, StartBuildParams, stopBuild } from "@/modules/build";
import { checkQuota } from "@/modules/workspace/check-quota";
import { Logger } from "@/plugins";
import BuildService from "@/services/BuildService";

import BaseController from "./BaseController";

@Tags("Build")
@Route("build")
export default class BuildController extends BaseController<IBuild> {
	service: BuildService;

	constructor() {
		super(new BuildService());
	}

	/**
	 * List of builds
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		console.log("BuildController > this.filter :>> ", this.filter);
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: BuildDto, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: BuildDto, @Queries() queryParams?: IPostQueryParams) {
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
	 * Check status then build container image finish.
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/status")
	async getStatus(@Queries() queryParams?: { slug: string }) {
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
			const { status } = build;
			if (status) {
				result.data = status;
				return result;
			}
		}
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
		// check dx quota
		const quotaRes = await checkQuota(this.workspace);
		if (!quotaRes.status) return respondFailure(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed) return respondFailure(`You've exceeded the limit amount of concurrent builds.`);

		// default values
		if (this.user) body.user = this.user;

		// validates
		const { appSlug, buildNumber, user, userId, gitBranch, registrySlug } = body;
		if (!appSlug) return respondFailure({ msg: `App slug is required.` });
		if (!buildNumber) return respondFailure({ msg: `Build number is required.` });
		if (!user && !userId) return respondFailure({ msg: `User or UserID is required.` });
		if (!gitBranch) return respondFailure({ msg: `Git branch is required.` });
		if (!registrySlug) return respondFailure({ msg: `Container registry slug is required.` });
		// start the build
		const buildInfo = await startBuild(body);

		const buildServerUrl = Config.BASE_URL;
		const SOCKET_ROOM = `${appSlug}-${buildNumber}`;
		const logURL = `${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM}`;

		return { status: 1, messages: [`Building...`], data: { logURL, ...buildInfo } } as ResponseData;
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/stop")
	async stopBuild(@Body() body: { slug: string }) {
		const { slug } = body;
		// console.log("slug :>> ", slug);
		// return ApiResponse.failed(res, `${slug}`);

		if (!slug) return respondFailure(`Build "slug" is required.`);

		let build = await this.service.findOne({ slug });
		if (!build) return respondFailure(`Build "${slug}" not found.`);

		const stoppedBuild = await stopBuild(build.projectSlug, build.appSlug, slug.toString());
		if ((stoppedBuild as { error: string })?.error) return respondFailure((stoppedBuild as { error: string }).error);

		build = await this.service.updateOne({ _id: build._id }, { status: "failed" });
		return respondSuccess({ data: build });
	}
}
