import { Response as AppResponse } from "diginext-utils/dist/response";
import { logError } from "diginext-utils/dist/xconsole/log";
import type { NextFunction, Response } from "express";

import type { AppRequest } from "@/interfaces/SystemTypes";

export const failSafeHandler = async (error: Error, req: AppRequest, res: Response, next: NextFunction) => {
	logError(`[FAIL_SAFE]`, error);

	// save log to database
	const { SystemLogService } = await import("@/services");
	const logSvc = new SystemLogService({ owner: req.user, workspace: req.workspace });
	logSvc.saveError(error, { name: "express-fail-safe" });

	if (error) {
		AppResponse.failed(res, error.toString());
	} else {
		AppResponse.failed(res, "Sum ting wong?");
	}
};
