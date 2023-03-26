import type express from "express";

import { apiAccessTokenHandler } from "./api-access-token-handler";
import jwt_auth from "./jwt_auth";

export const authenticate = async (req: any, res: express.Response, next: express.NextFunction) => {
	// console.log(`Handling API_ACCESS_TOKEN`, req.headers);

	// API_ACCESS_TOKEN will be transformed to lowercase in Express:
	const API_ACCESS_TOKEN = req.headers.api_access_token?.toString();

	if (API_ACCESS_TOKEN) {
		return apiAccessTokenHandler(req, res, next);
	} else {
		return jwt_auth(req, res, next);
	}
};
