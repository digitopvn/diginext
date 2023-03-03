import { logRes } from "diginext-utils/dist/console/log";
import { Response as AppResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";

export const route404_handler = (req: Request, res: Response, next: NextFunction) => {
	logRes(res, `Forgot to register this route in "api/v1/index"?`);
	return AppResponse.ignore(res);
};
