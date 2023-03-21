import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { log } from "diginext-utils/dist/console/log";
import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import express from "express";

// Auth with JWT
import jwt_auth from "@/middlewares/jwt_auth";
import { generateJWT } from "@/modules/passports/jwtStrategy";

// Auth with session
// import { authenticate } from "@/middlewares/authenticate";

dayjs.extend(relativeTime);

const router = express.Router();

router.get("/", jwt_auth, (req: Request, res: Response, next: NextFunction) => {
	/**
	 // TODO: Implement REFRESH TOKEN strategy
	 * Should invalidate the old token as well
	 * @ref https://dev.to/cyberwolves/jwt-authentication-with-access-tokens-refresh-tokens-in-node-js-5aa9
	 **/
	// log('req :>> ', req);
	const user = (req as any).user;
	const userId = user._id;

	log("Refreshing access token for the user :>> ", user);
	const access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "48h" });

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
