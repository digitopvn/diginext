import type { NextFunction, Response } from "express";

import type { ResponseData } from "@/interfaces";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { maskSensitiveInfo } from "@/plugins/mask-sensitive-info";

export const processApiRequest = (executor: (...params) => Promise<ResponseData>) => async (req: AppRequest, res: Response, next: NextFunction) => {
	try {
		let result = await executor(req.body);

		// mask sensitive information before responding:
		result.data = maskSensitiveInfo(result.data, req.role);

		res.status(200).json(result);
	} catch (e) {
		// forward the error to Express.js Error Handling Route
		next(e);
	}
};
