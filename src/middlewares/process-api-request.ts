import type { NextFunction, Request, Response } from "express";

import type { ResponseData } from "@/interfaces";

export const processApiRequest = (executor: (...params) => Promise<ResponseData>) => async (req: Request, res: Response, next: NextFunction) => {
	try {
		let result = await executor(req.body);
		res.status(200).json(result);
	} catch (e) {
		// forward the error to Express.js Error Handling Route
		next(e);
	}
};
