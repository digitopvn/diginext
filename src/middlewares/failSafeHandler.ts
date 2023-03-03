import { Response as AppResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";

export const failSafeHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
	if (error && error.message) {
		AppResponse.failed(res, error.message);
	} else {
		AppResponse.failed(res, "Sum ting wong?");
	}
};
