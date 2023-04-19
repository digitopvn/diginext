import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { log } from "diginext-utils/dist/console/log";
import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";
import express from "express";
import { isEmpty } from "lodash";

import { respondFailure } from "@/interfaces";
import type { AppRequest } from "@/interfaces/SystemTypes";
// Auth with JWT
import jwt_auth from "@/middlewares/auth-jwt";
import { generateJWT } from "@/modules/passports/jwtStrategy";
import { extractWorkspaceIdFromUser } from "@/plugins";
import { MongoDB } from "@/plugins/mongodb";

// Auth with session
// import { authenticate } from "@/middlewares/authenticate";

dayjs.extend(relativeTime);

const router = express.Router();

router.get("/", jwt_auth, (req: AppRequest, res: Response, next: NextFunction) => {
	/**
	 // TODO: Implement REFRESH TOKEN strategy
	 * Should invalidate the old token as well
	 * @ref https://dev.to/cyberwolves/jwt-authentication-with-access-tokens-refresh-tokens-in-node-js-5aa9
	 **/
	// log('req :>> ', req);
	const { user } = req;
	if (isEmpty(user)) return respondFailure({ msg: `User is not existed. (probably deleted?)` });

	const userId = MongoDB.toString(user._id);
	const workspaceId = extractWorkspaceIdFromUser(user);

	log("Refreshing access token for the user :>> ", user);
	const access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });

	const expiredDate = dayjs().add(8, "hour");
	const expiredTimestamp = expiredDate.diff(dayjs());
	// const expToNow = expiredDate.fromNow();

	// assign new "access_token" info to HTTP request & responses:
	(req as any).token = {
		access_token,
		expiredTimestamp: expiredTimestamp,
		expiredDate: expiredDate.toDate(),
		expiredDateGTM7: expiredDate.format("YYYY-MM-DD HH:mm:ss"),
		// expToNow,
	};

	res.cookie("x-auth-cookie", access_token);
	res.header("Authorization", `Bearer ${access_token}`);

	return ApiResponse.succeed(res, user);
});

export default router;
