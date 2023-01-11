import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import * as fs from "fs";
import path from "path";
import type { ParsedQs } from "qs";

import { CLI_DIR } from "@/config/const";
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

		const logPath = path.resolve(CLI_DIR, `public/logs/${slug}.txt`);
		const logs = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "No data.";

		return ApiResponse.succeed(res, logs);
	}
}
