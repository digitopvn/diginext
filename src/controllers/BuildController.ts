import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import * as fs from "fs";
import path from "path";
import type { ParsedQs } from "qs";

import { CLI_DIR } from "@/config/const";
import { stopBuild } from "@/modules/build";
import BuildService from "@/services/BuildService";

import BaseController from "./BaseController";

export default class BuildController extends BaseController<BuildService> {
	constructor() {
		super(new BuildService());
	}

	async getLogs(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const { slug } = req.query;

		if (!slug) return ApiResponse.failed(res, "slug is required.");

		const LOG_DIR = process.env.LOG_DIR ? path.resolve(process.env.LOG_DIR, `${slug}.txt`) : path.resolve(CLI_DIR, `public/logs/${slug}.txt`);
		// const logPath = path.resolve(CLI_DIR, `public/logs/${slug}.txt`);
		const logs = fs.existsSync(LOG_DIR) ? fs.readFileSync(LOG_DIR, "utf8") : "No data.";

		return ApiResponse.succeed(res, logs);
	}

	async stopBuild(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const { slug } = req.query;

		if (!slug) return ApiResponse.failed(res, "slug is required.");

		const build = await this.service.findOne({ slug });
		if (!build) return ApiResponse.failed(res, `Build "${slug}" not found.`);

		await stopBuild(build.appSlug, slug.toString());

		return ApiResponse.succeed(res, {});
	}
}
