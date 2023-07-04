import type { NextFunction, Request, Response } from "express";
import express from "express";
import { endsWith } from "lodash";
import passport from "passport";

import { Config } from "@/app.config";
import { generateJWT } from "@/modules/passports/jwtStrategy";
import { MongoDB } from "@/plugins/mongodb";

const router = express.Router();

// http://localhost:6969/auth/google?redirect_url=http://localhost:6969/auth/profile

export const signAndRedirect = (res: Response, data: { userId: string; workspaceId?: string }, redirectUrl: string) => {
	const { userId, workspaceId } = data;
	// console.log("[2] signAndRedirect > data :>> ", data);
	const access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });
	// console.log("[2] signAndRedirect > access_token :>>", access_token);

	// assign JWT access token to cookie and request headers:
	res.cookie("x-auth-cookie", access_token);
	res.header("Authorization", `Bearer ${access_token}`);

	// console.log("[2] signAndRedirect > redirectUrl :>> ", redirectUrl);
	// logged in successfully -> redirect to workspace:
	const url = new URL(redirectUrl);
	const params = new URLSearchParams(url.search);
	params.set("access_token", access_token);

	const finalUrl = url.origin + "/workspace/select?access_token=" + access_token;
	console.log("[2] signAndRedirect > finalUrl", finalUrl);
	return res.redirect(endsWith(finalUrl, "%23") ? finalUrl.substring(0, finalUrl.length - 3) : finalUrl);
};

router
	.get("/", (req: Request, res: Response, next: NextFunction) =>
		passport.authenticate("google", {
			scope: ["email", "profile"],
			state: req.query.redirect_url as string,
			successRedirect: req.query.redirect_url as string,
			session: false,
		})(req, res, next)
	)
	.get("/callback", (req: Request, res: Response, next: NextFunction) =>
		passport.authenticate(
			"google",
			{
				session: false,
				successReturnToOrRedirect: req.query.redirect_url as string,
				failureRedirect: Config.getBasePath("/login?type=failed"),
			},
			// callback function
			async (error, user, info) => {
				if (error) {
					console.log("error :>> ", error);
					return res.redirect(req.get("origin") + Config.getBasePath("/login?type=failed"));
				}

				let redirectUrl = (req.query.state as string) || Config.BASE_URL;
				const originUrl = new URL(redirectUrl).origin;

				if (!user) return res.redirect(originUrl + Config.getBasePath("/login?type=failed"));

				const userId = MongoDB.toString(user._id);
				const workspaceId =
					user.activeWorkspace && MongoDB.isValidObjectId(user.activeWorkspace) ? MongoDB.toString(user.activeWorkspace) : undefined;

				return signAndRedirect(res, { userId, workspaceId }, redirectUrl);
			}
		)(req, res, next)
	);

export default router;
