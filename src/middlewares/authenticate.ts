import type express from "express";

import type { AppRequest } from "@/interfaces/SystemTypes";

import { apiAccessTokenHandler } from "./auth-api-key";
import jwt_auth from "./auth-jwt";

export const authenticate = async (req: AppRequest, res: express.Response, next: express.NextFunction) => {
	// API_ACCESS_TOKEN will be transformed to lowercase in Express:
	// console.log("req.headers :>> ", req.headers);

	const API_ACCESS_TOKEN = req.headers["x-api-key"]?.toString();

	// console.log("req.headers[x-api-key] :>> ", API_ACCESS_TOKEN);
	// console.log("req.headers.authorization :>> ", req.headers.authorization);

	if (API_ACCESS_TOKEN) {
		return apiAccessTokenHandler(req, res, next);
	} else {
		return jwt_auth(req, res, next);
	}
};
