import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import express from "express";

import { authenticate } from "@/middlewares/authenticate";

// Auth with session
// import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => ApiResponse.succeed(res, req.user));

export default router;
