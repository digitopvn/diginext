import { logError } from "diginext-utils/dist/xconsole/log";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IApp, IRelease } from "@/entities";
import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import { DB } from "@/modules/api/DB";
import { createReleaseFromApp } from "@/modules/build/create-release-from-app";
import { createReleaseFromBuild } from "@/modules/build/create-release-from-build";
import ClusterManager from "@/modules/k8s";
import { MongoDB } from "@/plugins/mongodb";
import BuildService from "@/services/BuildService";
import ReleaseService from "@/services/ReleaseService";

import BaseController from "./BaseController";

@Tags("Release")
@Route("release")
export default class ReleaseController extends BaseController<IRelease> {
	constructor() {
		super(new ReleaseService());
	}

	/**
	 * List of releases
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
	create(@Body() body: entities.ReleaseDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		// TODO: validate body and check for required params
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: entities.ReleaseDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
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
	@Post("/from-app")
	async createFromApp(
		@Body()
		body: {
			/**
			 * App's slug
			 */
			app: string;
			/**
			 * Deploy environment
			 * @example dev,prod,...
			 */
			env: string;
			/**
			 * Build number is image's tag (no special characters, eg. "dot" or "comma")
			 * @example latest, v01, prerelease, alpha, beta,...
			 */
			buildNumber: string;
		}
	) {
		if (!body.env) return respondFailure({ msg: `Param "env" (deploy environment code) is required.` });
		if (!body.buildNumber) return respondFailure({ msg: `Param "buildNumber" (image's tag) is required.` });

		const { app: appSlug, buildNumber } = body;

		const app = await DB.findOne<IApp>("app", { slug: appSlug });
		if (!app) return respondFailure(`App "${appSlug}" not found.`);

		const newRelease = await createReleaseFromApp(app, body.env, buildNumber, { author: this.user, workspace: this.workspace });
		if (!newRelease) return respondFailure({ msg: `Failed to create new release from build data.` });

		return respondSuccess({ data: newRelease });
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/from-build")
	async createFromBuild(
		@Body()
		body: {
			/**
			 * Build's ID
			 */
			build: string;
			/**
			 * Deploy environment
			 * @example dev,prod,...
			 */
			env: string;
		}
	) {
		if (!body.env) return respondFailure({ msg: `Param "env" (deploy environment code) is required.` });

		const { build: buildId } = body;

		if (!buildId) return respondFailure({ msg: `Param "build" (ID) is required.` });

		const buildSvc = new BuildService();
		const build = await buildSvc.findOne({ _id: buildId });
		if (!build) return respondFailure({ msg: `Build (${buildId}) not found.` });

		const newRelease = await createReleaseFromBuild(build, body.env, { author: this.user });
		if (!newRelease) return respondFailure({ msg: `Failed to create new release from build data.` });

		return respondSuccess({ data: newRelease });
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/rollout")
	async rollout(@Body() data: { id: string }) {
		const { id: idInFilter } = this.filter;
		const { id } = data;

		const releaseId = id || idInFilter;

		// console.log("controller > rollout > id :>> ", id);
		if (!releaseId) return respondFailure({ msg: `Release ID is required.` });

		try {
			const rolloutResult = await ClusterManager.rollout(MongoDB.toString(id));
			if (rolloutResult.error) {
				return respondFailure({ msg: rolloutResult.error });
			}

			return respondSuccess({ data: rolloutResult.data });
		} catch (e) {
			return respondFailure({ msg: e.toString() });
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/preview")
	async previewPrerelease(@Body() data: { id: string }) {
		const { id: idInFilter } = this.filter;
		const { id } = data;

		const releaseId = id || idInFilter;
		if (!releaseId) return respondFailure({ msg: `Release ID is required.` });

		try {
			const previewRes = await ClusterManager.previewPrerelease(MongoDB.toString(id));

			if (previewRes.error) {
				return respondFailure({ msg: previewRes.error });
			}

			return respondSuccess({ data: previewRes.data });
		} catch (e) {
			return respondFailure({ msg: e.toString() });
		}
	}

	/**
	 * @deprecated
	 */
	async migrate() {
		logError(`This function was deprecated.`);
	}
}
