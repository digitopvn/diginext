import type { NextFunction, Request, Response } from "express";

const logEnabled =
	(enabled = true) =>
	(req: Request, res: Response, next: NextFunction) => {
		res.locals.req = req;
		res.locals.logEnabled = enabled;
		next();
	};

export default logEnabled;
