import type { NextFunction, Request, Response } from "express";
import express from "express";
import passport from "passport";

import { Config } from "@/app.config";
import type { Workspace } from "@/entities";
import type User from "@/entities/User";
import { DB } from "@/modules/api/DB";
import { generateJWT } from "@/modules/passports/jwtStrategy";
import { extractWorkspaceSlugFromUrl } from "@/plugins";

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
				failureRedirect: Config.getBasePath("/login?type=failed"),
			})(req, res, next),
		async function (req: any, res: any) {
			// console.log("googleLoginCallback > req", req);
			// console.log("googleLoginCallback > req.query", req.query);
			// console.log("googleLoginCallback > req.query.state", req.query.state);
			// console.log("googleLoginCallback > user :>> ", user);

			let redirectUrl = (req.query.state as string) || req.get("origin");
			// log("redirectUrl", redirectUrl);

			let user = req.user as User;
			if (!user) return req.redirect(Config.getBasePath("/login?type=failed"));

			const userId = user._id.toString();
			const workspaceSlug = extractWorkspaceSlugFromUrl(redirectUrl);

			// workspace is undefined -> redirect to select/create workspaces:
			if (!workspaceSlug || workspaceSlug === "www" || workspaceSlug === "app") {
				return res.redirect(Config.getBasePath("/workspace/select"));
			}

			// try to find this workspace in the database:
			const workspace = await DB.findOne<Workspace>("workspace", { slug: workspaceSlug });
			if (!workspace) return res.redirect(Config.getBasePath("/workspace/select"));

			// if found a workspace -> generate JWT access token:
			const workspaceId = workspace._id.toString();
			const access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });
			// log("access_token", access_token);

			// assign JWT access token to cookie and request headers:
			res.cookie("x-auth-cookie", access_token);
			res.header("Authorization", `Bearer ${access_token}`);

			// logged in successfully -> redirect to workspace:
			const url = new URL(redirectUrl);
			const params = new URLSearchParams(url.search);
			params.set("access_token", access_token);

			const finalUrl = url.origin + url.pathname + "?" + params.toString();
			// log("finalUrl", finalUrl);
			res.redirect(finalUrl);
		}
	);

export default router;
