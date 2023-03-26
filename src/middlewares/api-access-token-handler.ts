import dayjs from "dayjs";
import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { AccessTokenInfo, Workspace } from "@/entities";
import { User } from "@/entities";
import { DB } from "@/modules/api/DB";

function getUnexpiredAccessToken(access_token: string) {
	let expiredDate = dayjs("2999-12-31");
	let expiredTimestamp = expiredDate.diff(dayjs());

	// assign "access_token" info to request:
	const token: AccessTokenInfo = {
		access_token,
		expiredTimestamp: expiredTimestamp,
		expiredDate: expiredDate.toDate(),
		expiredDateGTM7: expiredDate.format("YYYY-MM-DD HH:mm:ss"),
	};

	return token;
}

export const apiAccessTokenHandler = async (req: any, res: Response, next: NextFunction) => {
	// console.log(`Handling API_ACCESS_TOKEN`, req.headers);
	// API_ACCESS_TOKEN will be transformed to lowercase in Express:
	const access_token = req.headers.api_access_token.toString();
	if (!access_token) return ApiResponse.rejected(res, "Authorization header missing");

	const workspaceFromApiAccessToken = await DB.findOne<Workspace>("workspace", { "apiAccessTokens.token": access_token });

	if (workspaceFromApiAccessToken) {
		const apiAccessToken = workspaceFromApiAccessToken.apiAccessTokens.find((apiToken) => apiToken.token === access_token);

		// mock a {User} represent for this API Access Token
		const mockedApiAccessTokenUser = new User();
		mockedApiAccessTokenUser._id = access_token;
		mockedApiAccessTokenUser.name = mockedApiAccessTokenUser.slug = mockedApiAccessTokenUser.username = apiAccessToken.name;
		mockedApiAccessTokenUser.email = `${access_token}@${workspaceFromApiAccessToken.slug}.${DIGINEXT_DOMAIN}`;
		mockedApiAccessTokenUser.roles = apiAccessToken.roles;
		mockedApiAccessTokenUser.token = getUnexpiredAccessToken(access_token);
		mockedApiAccessTokenUser.active = true;
		mockedApiAccessTokenUser.workspaces = [workspaceFromApiAccessToken];
		mockedApiAccessTokenUser.activeWorkspace = workspaceFromApiAccessToken;
		mockedApiAccessTokenUser.createdAt = workspaceFromApiAccessToken.createdAt;
		mockedApiAccessTokenUser.updatedAt = workspaceFromApiAccessToken.updatedAt;

		// Set the flag to indicate that the user has been authenticated -> skip JWT
		req.user = mockedApiAccessTokenUser;
		req.isAuthenticated = true;

		next();
	} else {
		return ApiResponse.rejected(res, "API access token is invalid.");
	}

	// next();

	// return res.status(401).json({ message: "Invalid token" });
};
