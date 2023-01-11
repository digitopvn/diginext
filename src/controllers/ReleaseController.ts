import { isJSON } from "class-validator";
import { toBool } from "diginext-utils/dist/object";
import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { isEmpty } from "lodash";
import type { ParsedQs } from "qs";

import type { Release } from "@/entities";
import { createReleaseFromBuild } from "@/modules/build/create-release-from-build";
import ClusterManager from "@/modules/k8s";
import BuildService from "@/services/BuildService";
import ReleaseService from "@/services/ReleaseService";

import BaseController from "./BaseController";

export default class ReleaseController extends BaseController<ReleaseService> {
	constructor() {
		super(new ReleaseService());
	}

	async create(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		// parse ENV variables
		const { envVars } = req.body as Release;
		if (isJSON(envVars)) req.body.env = JSON.parse(envVars as string);

		return super.create(req, res, next);
	}

	async createFromBuild(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const { build: buildId } = req.body;

		if (!buildId) {
			ApiResponse.failed(res, `Param "build" (ID) is required.`);
			return;
		}

		const buildSvc = new BuildService();
		const build = await buildSvc.findOne({ _id: buildId });
		if (isEmpty(build)) {
			ApiResponse.failed(res, `Build (${buildId}) not found.`);
			return;
		}

		const newRelease = await createReleaseFromBuild(build);
		if (isEmpty(newRelease)) {
			ApiResponse.failed(res, `Failed to create new release from build data.`);
			return;
		}

		let result: any = { status: 1, data: newRelease };

		// assign refreshed token if any:
		// TODO: this is not safe -> should use refresh token!
		const { token } = req as any;
		if (token) result.token = token;

		// return ApiResponse.succeed(res, data);
		return res.status(200).json(result);
	}

	async rollout(req: Request, res: Response, next: NextFunction) {
		const { id } = req.body;

		// console.log("controller > rollout > id :>> ", id);
		if (!id) return ApiResponse.failed(res, "Release ID is required.");

		// console.log("controller > rollout > headers.authorization :>> ", req.headers.authorization);
		if (!req.headers.authorization) return ApiResponse.failed(res, "Not authorized.");

		const data = await ClusterManager.rollout(id.toString());
		if (data.error) return ApiResponse.failed(res, data.error);

		return ApiResponse.succeed(res, data.data);
	}

	async previewPrerelease(req: Request, res: Response, next: NextFunction) {
		const { id } = req.body;

		// console.log("controller > rollout > id :>> ", id);
		if (!id) return ApiResponse.failed(res, "Release ID is required.");

		// console.log("controller > rollout > headers.authorization :>> ", req.headers.authorization);
		if (!req.headers.authorization) return ApiResponse.failed(res, "Not authorized.");

		const data = await ClusterManager.previewPrerelease(id.toString());
		if (data.error) return ApiResponse.failed(res, data.error);

		return ApiResponse.succeed(res, data.data);
	}

	async migrate(req: Request, res: Response, next: NextFunction) {
		const allReleases = await this.service.find({});
		const updatedReleases = allReleases.map(async (re) => {
			return this.service.update({ _id: re._id }, { active: toBool(re.active.toString()) });
		});
		const data = await Promise.all(updatedReleases);

		return ApiResponse.succeed(res, data);
	}
}
