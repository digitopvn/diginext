import type { NextFunction, Response } from "express";
import express from "express";

import { respondFailure, respondSuccess } from "@/interfaces";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { authenticate } from "@/middlewares/authenticate";

// Auth with session
// import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

router.get("/", authenticate, async (req: AppRequest, res: Response, next: NextFunction) => {
	const { DB } = await import("@/modules/api/DB");
	if (req.user) {
		try {
			await DB.updateOne("user", { _id: req.user._id }, { $unset: { activeRole: "", activeWorkspace: "" } }, { raw: true });
		} catch (e) {
			return respondFailure(`Unable to logout: ${e}`);
		}
	}
	return respondSuccess({ data: {}, msg: `Ok` });
});

export default router;
