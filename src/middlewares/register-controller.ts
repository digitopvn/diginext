import type { NextFunction, Response } from "express";

import type { IWorkspace } from "@/entities";
import type { AppRequest } from "@/interfaces/SystemTypes";

export const registerController = (controller: any) => {
	return async (req: AppRequest, res: Response, next: NextFunction) => {
		try {
			const { DB } = await import("@/modules/api/DB");
			// assign Express request
			controller.req = req;

			// assign current user to the controller
			controller.user = req.user;

			// get current workspace
			if (controller.user?.activeWorkspace) {
				const wsId = (controller.user?.activeWorkspace as IWorkspace)._id || (controller.user?.activeWorkspace as any);
				controller.workspace =
					typeof (controller.user?.activeWorkspace as any)._id === "undefined"
						? (controller.user?.activeWorkspace as IWorkspace)
						: await DB.findOne("workspace", { _id: wsId });
			}
			req.workspace = controller.workspace;

			// assign ownership
			controller.ownership = { owner: controller.user, workspace: controller.workspace };

			// assign ownership, express.Request to service
			if (controller.service) {
				controller.service.user = controller.user;
				controller.service.workspace = controller.workspace;
				controller.service.ownership = controller.ownership;
				controller.service.req = req;
				controller.service.req.workspace = controller.workspace;
			}

			// parse filter, body and pagination data:
			if (controller.parsePagination) await controller.parsePagination(req);
			if (controller.parseFilter) controller.parseFilter(req);
			if (controller.parseBody) controller.parseBody(req);

			next();
		} catch (e) {
			// forward the error to Express.js Error Handling Route
			next(e);
		}
	};
};
