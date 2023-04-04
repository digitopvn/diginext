import { Response as AppResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";

export const failSafeHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
	if (error) {
		AppResponse.failed(res, error.toString());
	} else {
		AppResponse.failed(res, "Sum ting wong?");
	}
};
