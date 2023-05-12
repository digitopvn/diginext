import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";

import type { IRole, IUser, IWorkspace } from "@/entities";
import type { IApiKeyAccount } from "@/entities/ApiKeyAccount";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { DB } from "@/modules/api/DB";
import { MongoDB } from "@/plugins/mongodb";

export const apiAccessTokenHandler = async (req: AppRequest, res: Response, next: NextFunction) => {
	// console.log(`Handling API_ACCESS_TOKEN`, req.headers);

	const access_token = req.headers["x-api-key"].toString();
	if (!access_token) return ApiResponse.rejected(res, "Authorization header missing");

	let apiKeyAccount = await DB.findOne<IApiKeyAccount>(
		"api_key_user",
		{ "token.access_token": access_token },
		{ populate: ["workspaces", "activeWorkspace", "roles"] }
	);

	if (apiKeyAccount) {
		// check active workspace
		if (!apiKeyAccount.activeWorkspace) {
			const workspaces = apiKeyAccount.workspaces as IWorkspace[];
			if (workspaces.length === 1) {
				[apiKeyAccount] = await DB.update<IUser>(
					"user",
					{ _id: apiKeyAccount._id },
					{ activeWorkspace: workspaces[0]._id },
					{ populate: ["roles", "workspaces", "activeWorkspace"] }
				);
			}
			req.workspace = apiKeyAccount.activeWorkspace as IWorkspace;
		}

		// role
		const { roles = [] } = apiKeyAccount;
		const activeRole = roles.find(
			(role) =>
				MongoDB.toString((role as IRole).workspace) === MongoDB.toString((apiKeyAccount.activeWorkspace as IWorkspace)?._id) &&
				!(role as IRole).deletedAt
		) as IRole;

		apiKeyAccount.activeRole = activeRole;
		req.role = activeRole;

		// user
		req.user = apiKeyAccount;
		res.locals.user = apiKeyAccount;

		next();
	} else {
		return ApiResponse.rejected(res, "API access token is invalid.");
	}

	// next();

	// return res.status(401).json({ message: "Invalid token" });
};
