import { toBool } from "diginext-utils/dist/object";
import { isEmpty } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { Release } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { createReleaseFromBuild } from "@/modules/build/create-release-from-build";
import ClusterManager from "@/modules/k8s";
import BuildService from "@/services/BuildService";
import ReleaseService from "@/services/ReleaseService";

import BaseController from "./BaseController";

@Tags("Release")
@Route("release")
export default class ReleaseController extends BaseController<Release> {
	constructor() {
		super(new ReleaseService());
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
	create(@Body() body: Omit<Release, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		// const { envVars } = body;
		// if (isJSON(envVars)) body.env = JSON.parse(envVars as string);
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<Release, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
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
	@Post("/from-build")
	async createFromBuild(@Body() body: { build: string }) {
		let result: ResponseData & { data: Release } = { status: 1, data: {}, messages: [] };

		const { build: buildId } = body;

		if (!buildId) {
			result.status = 0;
			result.messages.push(`Param "build" (ID) is required.`);
			return result;
		}

		const buildSvc = new BuildService();
		const build = await buildSvc.findOne({ _id: buildId });
		if (isEmpty(build)) {
			result.status = 0;
			result.messages.push(`Build (${buildId}) not found.`);
			return result;
		}

		const newRelease = await createReleaseFromBuild(build);
		if (isEmpty(newRelease)) {
			result.status = 0;
			result.messages.push(`Failed to create new release from build data.`);
			return result;
		}

		result.data = newRelease;

		// assign refreshed token if any:
		// TODO: this is not safe -> should use refresh token!
		// const { token } = req as any;
		// if (token) result.token = token;

		// return ApiResponse.succeed(res, data);
		return result;
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/rollout")
	async rollout(@Body() data: { id: string }) {
		const { id } = data;

		let result: ResponseData & { data: Release } = { status: 1, data: {}, messages: [] };

		// console.log("controller > rollout > id :>> ", id);
		if (!id) {
			result.status = 0;
			result.messages.push("Release ID is required.");
			return result;
		}

		const rolloutResult = await ClusterManager.rollout(id.toString());
		if (rolloutResult.error) {
			result.status = 0;
			result.messages.push(rolloutResult.error);
			return result;
		}

		result.data = rolloutResult.data;

		return result;
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/preview")
	async previewPrerelease(@Body() data: { id: string }) {
		const { id } = data;

		let result: ResponseData & { data: Release } = { status: 1, data: {}, messages: [] };
		// console.log("controller > rollout > id :>> ", id);
		if (!id) {
			result.status = 0;
			result.messages.push("Release ID is required.");
			return result;
		}

		const previewRes = await ClusterManager.previewPrerelease(id.toString());
		if (previewRes.error) {
			result.status = 0;
			result.messages.push(previewRes.error);
			return result;
		}

		result.data = previewRes.data;

		return result;

		// return ApiResponse.succeed(res, data.data);
	}

	async migrate() {
		let result: ResponseData & { data: Release[] } = { status: 1, data: [], messages: [] };

		const allReleases = await this.service.find({});
		const updatedReleases = allReleases.map(async (re) => {
			return this.service.update({ _id: re._id }, { active: toBool(re.active.toString()) });
		});
		const data = await Promise.all(updatedReleases);
		result.data = data.map((re) => (re && re.length > 0 ? re[0] : null));

		return result;
	}
}
