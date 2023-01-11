import type { NextFunction, Request, Response } from "express";

import type User from "@/entities/User";
import type { IRoutePermission } from "@/interfaces/IPermission";

export const authorize =
	(...allowedPermissions: IRoutePermission[]) =>
	async (req: Request, res: Response, next: NextFunction) => {
		const user = (req as any).user as User;

		const { originalUrl: route, method } = req;

		// TODO: Implement RBAC strategy

		next();
	};
