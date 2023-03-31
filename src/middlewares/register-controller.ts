import type { NextFunction, Request, Response } from "express";

import type BaseController from "@/controllers/BaseController";
import type { User, Workspace } from "@/entities";
import { DB } from "@/modules/api/DB";

export const registerController = <T = any>(controller: BaseController<T>) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// assign current user to the controller
			controller.user = req.user as User;

			// get current workspace
			if (controller.user?.activeWorkspace) {
				const wsId = (controller.user?.activeWorkspace as Workspace)._id || (controller.user?.activeWorkspace as any);
				controller.workspace =
					typeof (controller.user?.activeWorkspace as any)._id === "undefined"
						? (controller.user?.activeWorkspace as Workspace)
						: await DB.findOne<Workspace>("workspace", { _id: wsId });
			}

			next();
		} catch (e) {
			// forward the error to Express.js Error Handling Route
			next(e);
		}
	};
};
