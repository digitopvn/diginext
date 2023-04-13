import { Response as AppResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";

import type { AppRequest } from "@/interfaces/SystemTypes";

export const failSafeHandler = (error: Error, req: AppRequest, res: Response, next: NextFunction) => {
	if (error) {
		AppResponse.failed(res, error.toString());
	} else {
		AppResponse.failed(res, "Sum ting wong?");
	}
};
