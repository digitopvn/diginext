import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";

import type { IRole, IUser, IWorkspace } from "@/entities";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { DB } from "@/modules/api/DB";
import { MongoDB } from "@/plugins/mongodb";

export const apiAccessTokenHandler = async (req: AppRequest, res: Response, next: NextFunction) => {
	// console.log(`Handling API_ACCESS_TOKEN`, req.headers);

	// API_ACCESS_TOKEN will be transformed to lowercase in Express:
	const access_token = req.headers.api_access_token.toString();
	if (!access_token) return ApiResponse.rejected(res, "Authorization header missing");

	let user = await DB.findOne<IUser>(
		"api_key_user",
		{ "token.access_token": access_token },
		{ populate: ["workspaces", "activeWorkspace", "roles"] }
	);

	if (user) {
		// check active workspace
		if (!user.activeWorkspace) {
			const workspaces = user.workspaces as IWorkspace[];
			if (workspaces.length === 1) {
				[user] = await DB.update<IUser>(
					"user",
					{ _id: user._id },
					{ activeWorkspace: workspaces[0]._id },
					{ populate: ["roles", "workspaces", "activeWorkspace"] }
				);
			}
			req.workspace = user.activeWorkspace as IWorkspace;
		}

		// role
		const { roles = [] } = user;
		const activeRole = roles.find(
			(role) =>
				MongoDB.toString((role as IRole).workspace) === MongoDB.toString((user.activeWorkspace as IWorkspace)?._id) &&
				!(role as IRole).deletedAt
		) as IRole;

		user.activeRole = activeRole;
		req.role = activeRole;

		// user
		req.user = user;
		res.locals.user = user;

		next();
	} else {
		return ApiResponse.rejected(res, "API access token is invalid.");
	}

	// next();

	// return res.status(401).json({ message: "Invalid token" });
};
