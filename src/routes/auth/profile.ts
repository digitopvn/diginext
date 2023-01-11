import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import express from "express";

// Auth with JWT
import jwt_auth from "@/middlewares/jwt_auth";

// Auth with session
// import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

router.get("/", jwt_auth, (req: Request, res: Response, next: NextFunction) => {
	// extract "token" from "jwtStrategy" callback
	// console.log("req.token :>> ", req.token);

	const user = req.user as any;
	user.token = (req as any).token;

	// console.log("[/auth/profile] user :>> ", user);

	return ApiResponse.succeed(res, user);
});

export default router;
