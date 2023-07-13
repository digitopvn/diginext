import { Response as ApiResponse, Response } from "diginext-utils/dist/response";
import type { NextFunction, Response as ExpressResponse } from "express";
import { isEmpty } from "lodash";

import type { IRole, IWorkspace } from "@/entities";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { MongoDB } from "@/plugins/mongodb";

export const apiAccessTokenHandler = async (req: AppRequest, res: ExpressResponse, next: NextFunction) => {
	const { DB } = await import("@/modules/api/DB");
	// extract API key from headers
	const access_token = req.headers["x-api-key"].toString();

	let apiKeyAccount = await DB.findOne(
		"api_key_user",
		{ "token.access_token": access_token },
		{ populate: ["workspaces", "activeWorkspace", "roles", "activeRole"] }
	);

	if (apiKeyAccount) {
		// check active workspace
		if (!apiKeyAccount.activeWorkspace) {
			const workspaces = apiKeyAccount.workspaces as IWorkspace[];
			if (workspaces.length === 1) {
				apiKeyAccount = await DB.updateOne(
					"api_key_user",
					{ _id: apiKeyAccount._id },
					{ activeWorkspace: workspaces[0]._id },
					{ populate: ["roles", "workspaces", "activeWorkspace"] }
				);
			}
		}
		req.workspace = apiKeyAccount.activeWorkspace as IWorkspace;

		// role
		const { roles = [] } = apiKeyAccount;
		const activeRole = roles.find(
			(role) =>
				MongoDB.toString((role as IRole).workspace) === MongoDB.toString((apiKeyAccount.activeWorkspace as IWorkspace)?._id) &&
				!(role as IRole).deletedAt
		) as IRole;

		if (activeRole && apiKeyAccount.activeRole !== activeRole._id)
			apiKeyAccount = await DB.updateOne(
				"api_key_user",
				{ _id: apiKeyAccount._id },
				{ activeRole: activeRole._id },
				{ populate: ["roles", "workspaces", "activeWorkspace", "activeRole"] }
			);
		req.role = apiKeyAccount.activeRole = activeRole;

		// WHY????
		if (isEmpty(apiKeyAccount.activeWorkspace)) delete apiKeyAccount.activeWorkspace;
		if (isEmpty(apiKeyAccount.activeRole)) delete apiKeyAccount.activeRole;
		if (isEmpty(apiKeyAccount.activeWorkspace) && isEmpty(apiKeyAccount.activeRole)) return Response.rejected(res, "Permissions denied.");

		// user
		req.user = apiKeyAccount;
		res.locals.user = apiKeyAccount;

		return next();
	} else {
		return ApiResponse.rejected(res, "API access token is invalid.");
	}

	// next();

	// return res.status(401).json({ message: "Invalid token" });
};
