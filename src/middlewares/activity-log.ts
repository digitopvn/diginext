import type { Express, NextFunction } from "express";

import type { AppRequest } from "@/interfaces/SystemTypes";

export const saveActivityLog = async (req: AppRequest, res: Express.Response, next: NextFunction) => {
	const { user } = req;
	if (!user) {
		// parse & create activity dto:
		const activityDto = {};

		// write activity log to database:
	}
	next();
};
