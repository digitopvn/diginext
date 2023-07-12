import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "@tsoa/runtime";

import { Config } from "@/app.config";
import type { IBuild } from "@/entities";
import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import * as buildModule from "@/modules/build";
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
		const buildInfo = await buildModule.startBuild(body);

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

		const stoppedBuild = await buildModule.stopBuild(build.projectSlug, build.appSlug, slug.toString());
		if ((stoppedBuild as { error: string })?.error) return respondFailure((stoppedBuild as { error: string }).error);

		build = await this.service.updateOne({ _id: build._id }, { status: "failed" });
		return respondSuccess({ data: build });
	}
}
