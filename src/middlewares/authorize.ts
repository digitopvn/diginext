import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";

import type User from "@/entities/User";

export function authorize(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user as User;

	const { originalUrl: route, method } = req;

	let permit;
	switch (method.toLowerCase()) {
		case "post":
			permit = "create";
			break;
		case "patch":
			permit = "update";
			break;
		case "delete":
			permit = "delete";
			break;
		default:
			permit = "read";
			break;
	}

	let isAllowed = false;

	// if the user doesn't have roles, reject the request!
	if (!user || !user.roles || user.roles.length == 0) return ApiResponse.rejected(res);

	/**
	 * authorization logic here!
	 */
	const { roles } = user;

	// get "routes" -> find "key" as route & "value" as IRole
	roles.map((role) =>
		role.routes
			.filter((routeRole) => routeRole.route == "*" || routeRole.route == route)
			.map((routeRole) => {
				const _route = routeRole.route;
				const _permissions = routeRole[_route].permissions;
				if (_permissions.includes("full") || _permissions.includes(permit)) isAllowed = true;
				return routeRole;
			})
	);

	if (!isAllowed) return ApiResponse.rejected(res);

	next();
}
