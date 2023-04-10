import type { NextFunction, Response } from "express";

import type { ResponseData } from "@/interfaces";
import type { AppRequest } from "@/interfaces/SystemTypes";

export const processApiRequest = (executor: (...params) => Promise<ResponseData>) => async (req: AppRequest, res: Response, next: NextFunction) => {
	try {
		let result = await executor(req.body);
		res.status(200).json(result);
	} catch (e) {
		// forward the error to Express.js Error Handling Route
		next(e);
	}
};
