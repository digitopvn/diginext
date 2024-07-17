import type { NextFunction } from "express";

import { Config } from "@/app.config";
import type { ResponseData } from "@/interfaces";
import type { AppRequest, AppResponse } from "@/interfaces/SystemTypes";
import { maskSensitiveInfo } from "@/plugins/mask-sensitive-info";

import { saveActivityLog } from "./activity-log";

export const processApiRequest =
	(executor: (...params) => Promise<ResponseData>) => async (req: AppRequest, res: AppResponse, next: NextFunction) => {
		try {
			let result = await executor(req.body);

			// mask sensitive information before responding:
			// only for data which the current user doesn't own
			// console.log("Config.SHARE_RESOURCE_CREDENTIAL :>> ", Config.SHARE_RESOURCE_CREDENTIAL);
			if (!Config.SHARE_RESOURCE_CREDENTIAL && req.user) result.data = maskSensitiveInfo(result.data, req.user, req.role, req.baseUrl);

			// save activity log here...
			saveActivityLog(req, res, next);

			// respond data...
			res.status(200).json(result);
		} catch (e) {
			// forward the error to Express.js Error Handling Route
			next(e);
		}
	};

export const processApiRequestWithoutMasking =
	(executor: (...params) => Promise<ResponseData>) => async (req: AppRequest, res: AppResponse, next: NextFunction) => {
		try {
			let result = await executor(req.body);

			// save activity log here...
			saveActivityLog(req, res, next);

			// respond data...
			res.status(200).json(result);
		} catch (e) {
			// forward the error to Express.js Error Handling Route
			next(e);
		}
	};
