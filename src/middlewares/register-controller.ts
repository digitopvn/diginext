import type { NextFunction, Response } from "express";

import type BaseController from "@/controllers/BaseController";
import type { Workspace } from "@/entities";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { DB } from "@/modules/api/DB";

export const registerController = <T = any>(controller: BaseController<T>) => {
	return async (req: AppRequest, res: Response, next: NextFunction) => {
		try {
			// assign express.Request to service
			if (controller.service) controller.service.req = req;

			// assign current user to the controller
			controller.user = req.user;

			// get current workspace
			if (controller.user?.activeWorkspace) {
				const wsId = (controller.user?.activeWorkspace as Workspace)._id || (controller.user?.activeWorkspace as any);
				controller.workspace =
					typeof (controller.user?.activeWorkspace as any)._id === "undefined"
						? (controller.user?.activeWorkspace as Workspace)
						: await DB.findOne<Workspace>("workspace", { _id: wsId });
			}

			// parse filter, body and pagination data:
			await controller.parsePagination(req);
			controller.parseFilter(req);
			controller.parseBody(req);

			next();
		} catch (e) {
			// forward the error to Express.js Error Handling Route
			next(e);
		}
	};
};
