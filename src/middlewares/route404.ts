import { logRes } from "diginext-utils/dist/console/log";
import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction } from "express";

import type { AppRequest, AppResponse } from "@/interfaces/SystemTypes";

export const route404_handler = (req: AppRequest, res: AppResponse, next: NextFunction) => {
	logRes(res, `Forgot to register "${req.originalUrl}" route in "api/v1/index"?`);
	return ApiResponse.ignore(res);
};
