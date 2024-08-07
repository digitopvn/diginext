import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";
import { trimEnd } from "lodash";

import type { IRole, IWorkspace } from "@/entities";
import type { IRoutePermission } from "@/interfaces";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { MongoDB } from "@/plugins/mongodb";
import { filterUsersByWorkspaceRole } from "@/plugins/user-utils";

export async function authorize(req: AppRequest, res: Response, next: NextFunction) {
	try {
		let { user } = req;
		const { baseUrl, method, url, path } = req;
		const routePath = trimEnd(`${baseUrl}${path}`, "/");
		// console.log("authorize > route :>> ", route);

		// filter roles
		const wsId = (user.activeWorkspace as IWorkspace)?._id
			? MongoDB.toString((user.activeWorkspace as IWorkspace)._id)
			: MongoDB.toString(user.activeWorkspace);
		[user] = await filterUsersByWorkspaceRole(wsId, [user]);
		// console.log("authorize > user :>> ", user);

		// request permission:
		let requestPermission: IRoutePermission;
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

		// if the user doesn't have roles, reject the request!
		if (!user || !user.activeRole) return ApiResponse.rejected(res);

		let isAllowed = false;

		/**
		 * authorization logic here!
		 */
		// const { activeRole } = user;
		const activeRole = user.activeRole as IRole;
		// console.log("activeRole :>> ", activeRole);
		const userId = MongoDB.toString(user._id);
		// If wildcard "*" route is specified:
		let routeRole = activeRole.routes.find((routeInfo) => routeInfo.path === "*");

		if (routeRole) {
			if (!routeRole.permissions) routeRole.permissions = [];
			if (routeRole.permissions.includes(requestPermission)) {
				isAllowed = true;
			} else {
				// if permisions have "own" -> only have access to items which "owner" is "userID":
				if (routeRole.permissions.includes("full")) {
					// YOU ARE THE KING!
					isAllowed = true;
				} else if (routeRole.permissions.includes("public") && routeRole.permissions.includes("own")) {
					req.query.$or = [{ public: "true" }, { owner: userId }];
					delete req.query.owner;
					isAllowed = true;
				} else if (routeRole.permissions.includes("public")) {
					req.query.public = "true";
					isAllowed = true;
				} else if (routeRole.permissions.includes("own")) {
					req.query.owner = userId;
					isAllowed = true;
				} else {
					isAllowed = false;
				}
			}
		}

		// Check again if a specific route is specified:
		routeRole = activeRole.routes.find((routeInfo) => routeInfo.path === routePath);
		// console.log("authorize() > routeRole :>> ", routeRole);

		if (routeRole) {
			if (!routeRole.permissions) routeRole.permissions = [];
			if (routeRole.permissions.includes(requestPermission)) {
				delete req.query.owner;
				isAllowed = true;
			} else {
				// if permisions have "own" -> only have access to items which "owner" is "userID":
				if (routeRole.permissions.includes("full")) {
					delete req.query.owner;
					isAllowed = true;
				} else if (routeRole.permissions.includes("public") && routeRole.permissions.includes("own")) {
					req.query.$or = [{ public: true }, { owner: userId }];
					delete req.query.owner;
					isAllowed = true;
				} else if (routeRole.permissions.includes("public")) {
					req.query.public = true;
					isAllowed = true;
				} else if (routeRole.permissions.includes("own")) {
					req.query.owner = MongoDB.toString(user._id);
					isAllowed = true;
				} else if (routeRole.permissions.includes("read")) {
					delete req.query.owner;
				} else {
					isAllowed = false;
				}
			}
		}

		// print the debug info
		// console.log(
		// 	chalk.cyan(`=====> AUTHORIZING : Request for permission > [${requestPermission}]`),
		// 	`\n> API URL: ${routePath}`,
		// 	`\n> URL Query:`,
		// 	req.query,
		// 	`\n> ROLE :>> [WS: ${activeRole.workspace}] ${activeRole.name}:`,
		// 	`\n> routeRole:`,
		// 	routeRole,
		// 	`\n> Allowed permissions & routes: \n${activeRole.routes.map((r) => `  · ${r.path} - ${r.permissions.join(",") || "none"}`).join("\n")}`,
		// 	`\n>>> ALLOW:`,
		// 	isAllowed
		// );

		if (!isAllowed) return ApiResponse.rejected(res);

		// always lock query filter to workspace scope

		if (req.baseUrl === "/api/v1/user" || req.baseUrl === "/api/v1/service_account" || req.baseUrl === "/api/v1/api_key") {
			req.query.workspaces = wsId;
		} else {
			req.query.workspace = wsId;
		}

		// re-assign user to express.Request
		req.user = user;
		req.role = activeRole;

		next();
	} catch (e) {
		next(e);
	}
}
