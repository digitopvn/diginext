import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";
import express from "express";
import { isEmpty } from "lodash";

import { respondFailure } from "@/interfaces";
import type { AppRequest } from "@/interfaces/SystemTypes";
// Auth with JWT
import jwt_auth from "@/middlewares/auth-jwt";
import { extractAccessTokenInfo } from "@/modules/passports/jwtStrategy";
import { MongoDB } from "@/plugins/mongodb";

// Auth with session
// import { authenticate } from "@/middlewares/authenticate";

dayjs.extend(relativeTime);

const router = express.Router();

router.get("/", jwt_auth, async (req: AppRequest, res: Response, next: NextFunction) => {
	if (isEmpty(req.user)) return respondFailure({ msg: `UNAUTHENTICATED.` });
	const { user, workspace } = req;

	// 1. Extract token info
	let access_token = user.token?.access_token || req.query.access_token || req.cookies["x-auth-cookie"] || req.headers.authorization?.split(" ")[1];
	let refresh_token = req.query.refresh_token as string;
	if (isEmpty(access_token) || isEmpty(refresh_token)) return respondFailure({ msg: `Permissions denied.` });

	const payload = { id: MongoDB.toString(user._id), workspaceId: MongoDB.toString(workspace._id), exp: req.user.token.expiredTimestamp };
	const tokenInfo = await extractAccessTokenInfo({ access_token, refresh_token }, payload);

	// 2. Assign token to user
	user.token = tokenInfo.token;

	// 3. Assign token to response headers
	res.cookie("x-auth-cookie", access_token);
	res.header("Authorization", `Bearer ${access_token}`);

	return ApiResponse.succeed(res, user);
});

export default router;
