import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";

import type { Role } from "@/entities";
import type User from "@/entities/User";

export function authorize(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user as User;

	const { originalUrl: route, method } = req;

	let requestPermission;
	switch (method.toLowerCase()) {
		case "post":
			requestPermission = "create";
			break;
		case "patch":
			requestPermission = "update";
			break;
		case "delete":
			requestPermission = "delete";
			break;
		default:
			requestPermission = "read";
			break;
	}

	let isAllowed = false;

	// if the user doesn't have roles, reject the request!
	if (!user || !user.roles || user.roles.length == 0) return ApiResponse.rejected(res);

	/**
	 * authorization logic here!
	 */
	// const { roles } = user;
	const roles = user.roles as Role[];
	console.log("authorize > requestPermission :>> ", requestPermission);
	console.log("authorize > roles :>> ", roles);
	console.log("authorize > user :>> ", user.name, "-", user._id);

	// get "routes" -> find "key" as route & "value" as IRole
	roles.map((role) => {
		console.log("authorize > role.routes :>> ", role.routes);
		return role.routes
			.filter((routeInfo) => routeInfo.route == "*" || routeInfo.route == route)
			.map((routeInfo) => {
				const _route = routeInfo.route;
				const _permissions = routeInfo.permissions;

				// if permisions have "own" -> only have access to items which "owner" is "userID":
				if (_permissions.includes("full") || _permissions.includes(requestPermission)) {
					isAllowed = true;
				} else if (_permissions.includes("own")) {
					req.query.owner = user._id.toString();
					isAllowed = true;
				}

				return routeInfo;
			});
	});

	if (!isAllowed) return ApiResponse.rejected(res);

	next();
}
