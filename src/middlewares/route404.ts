import { logRes } from "diginext-utils/dist/console/log";
import { Response as AppResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";

const route404 = (error: any, req: Request, res: Response, next: NextFunction) => {
	logRes(res, "What do you want?");
	next(error);
};

export const route404_responder = (error: any, req: Request, res: Response, next: NextFunction) => {
	return AppResponse.ignore(res);
};

export const route404_handler = (req: Request, res: Response, next: NextFunction) => {
	logRes(res, `Forgot to register this route in "api/v1/index"?`);
	return AppResponse.ignore(res);
};

export default route404;
