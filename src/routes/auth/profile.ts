import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import express from "express";

import type { User } from "@/entities";
import { authenticate } from "@/middlewares/authenticate";
import { DB } from "@/modules/api/DB";

// Auth with session
// import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
	// console.log("req.user :>> ", req.user);
	const userId = (req.user as any)?.id;
	// if (!userId) return respondFailure({ msg: `Not authorized.` });

	const user = await DB.findOne<User>("user", { id: userId }, { populate: ["workspaces", "activeWorkspace"] });
	// if (!user) return respondFailure({ msg: `Not authorized.` });

	return ApiResponse.succeed(res, user);
});

export default router;
