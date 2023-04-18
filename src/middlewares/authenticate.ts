import type express from "express";

import type { AppRequest } from "@/interfaces/SystemTypes";

import { apiAccessTokenHandler } from "./auth-api-key";
import jwt_auth from "./auth-jwt";

export const authenticate = async (req: AppRequest, res: express.Response, next: express.NextFunction) => {
	// API_ACCESS_TOKEN will be transformed to lowercase in Express:
	const API_ACCESS_TOKEN = req.headers.api_access_token?.toString();

	// console.log("req.headers.api_access_token :>> ", API_ACCESS_TOKEN);
	// console.log("req.headers.authorization :>> ", req.headers.authorization);

	if (API_ACCESS_TOKEN) {
		return apiAccessTokenHandler(req, res, next);
	} else {
		return jwt_auth(req, res, next);
	}
};
