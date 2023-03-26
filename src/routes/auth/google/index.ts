import type { NextFunction, Request, Response } from "express";
import express from "express";
import passport from "passport";
import path from "path";

import { Config } from "@/app.config";
import type User from "@/entities/User";
import { generateJWT } from "@/modules/passports/jwtStrategy";
import { extractWorkspaceIdFromUser } from "@/plugins";

const router = express.Router();

// http://localhost:6969/auth/google?redirect_url=http://localhost:6969/auth/profile

router
	.get("/", (req: Request, res: Response, next: NextFunction) =>
		passport.authenticate("google", {
			scope: ["email", "profile"],
			state: req.query.redirect_url as string,
			successRedirect: req.query.redirect_url as string,
			session: false,
		})(req, res, next)
	)
	.get(
		"/callback",
		(req: Request, res: Response, next: NextFunction) =>
			passport.authenticate("google", {
				session: false,
				successReturnToOrRedirect: req.query.redirect_url as string,
				failureRedirect: Config.getBasePath("/auth/google/fail"),
			})(req, res, next),
		function (req, res) {
			// console.log("req", req);
			// console.log("req.query", req.query);
			// console.log("req.query.state", req.query.state);

			const shouldParseRedirectUrl = typeof req.query.state != "undefined";
			let redirectUrl = (req.query.state as string) ?? "/";
			// log("redirectUrl", redirectUrl);

			const user = req.user as User;
			const userId = user._id.toString();
			const workspaceId = extractWorkspaceIdFromUser(user);

			const access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });
			// log("access_token", access_token);

			// We can extract token from cookie (check "jwtStrategy.ts")
			res.cookie("x-auth-cookie", access_token);
			res.header("Authorization", `Bearer ${access_token}`);

			if (shouldParseRedirectUrl) {
				const url = new URL(redirectUrl);
				const params = new URLSearchParams(url.search);
				params.set("access_token", access_token);

				const finalUrl = url.origin + url.pathname + "?" + params.toString();
				// log("finalUrl", finalUrl);
				res.redirect(finalUrl);
			} else {
				res.redirect(redirectUrl + "?access_token=" + access_token);
			}
		}
	)
	.get("/test", function (req, res) {
		res.sendFile(path.resolve(process.cwd(), "views/google-auth.html"));
	});

export default router;
