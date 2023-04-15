import type { NextFunction, Request, Response } from "express";
import express from "express";
import passport from "passport";

import { Config } from "@/app.config";
import type { IWorkspace } from "@/entities";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { DB } from "@/modules/api/DB";
import { generateJWT } from "@/modules/passports/jwtStrategy";
import { extractWorkspaceSlugFromUrl } from "@/plugins";
import { isObjectId, MongoDB } from "@/plugins/mongodb";

const router = express.Router();

// http://localhost:6969/auth/google?redirect_url=http://localhost:6969/auth/profile

const signAndRedirect = (res: Response, data: { userId: string; workspaceId?: string }, redirectUrl: string) => {
	const { userId, workspaceId } = data;
	const access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });
	// log("access_token", access_token);

	// assign JWT access token to cookie and request headers:
	res.cookie("x-auth-cookie", access_token);
	res.header("Authorization", `Bearer ${access_token}`);

	console.log("[2] redirectUrl :>> ", redirectUrl);
	// logged in successfully -> redirect to workspace:
	const url = new URL(redirectUrl);
	const params = new URLSearchParams(url.search);
	params.set("access_token", access_token);

	const finalUrl = url.origin + url.pathname + "?" + params.toString();
	// log("finalUrl", finalUrl);
	res.redirect(finalUrl);
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
	.get(
		"/callback",
		(req: Request, res: Response, next: NextFunction) =>
			passport.authenticate("google", {
				session: false,
				successReturnToOrRedirect: req.query.redirect_url as string,
				failureRedirect: Config.getBasePath("/login?type=failed"),
			})(req, res, next),
		async function (req: AppRequest, res: any) {
			// console.log("googleLoginCallback > req", req);
			// console.log("googleLoginCallback > req.query", req.query);
			// console.log("googleLoginCallback > req.query.state", req.query.state);
			// console.log("googleLoginCallback > user :>> ", req.user);

			let redirectUrl = (req.query.state as string) || Config.BASE_URL;
			const shouldRedirect = typeof req.query.state !== "undefined";
			const originUrl = new URL(redirectUrl).origin;
			// console.log("[1] originUrl", originUrl);

			let { user } = req;
			// console.log("[1] googleLoginCallback > req.user :>> ", user.name, user._id);
			if (!user) return res.redirect(req.get("origin") + Config.getBasePath("/login?type=failed"));

			const userId = MongoDB.toString(user._id);
			const workspaceSlug = extractWorkspaceSlugFromUrl(redirectUrl);
			console.log("workspaceSlug :>> ", workspaceSlug);

			let workspace: IWorkspace;

			// workspace is undefined -> redirect to select/create workspaces:
			if (!workspaceSlug || workspaceSlug === "app") {
				if (user.workspaces.length === 1) {
					// if this user only have 1 workspace -> make it active!
					workspace = user.workspaces[0] as IWorkspace;
					return signAndRedirect(res, { userId, workspaceId: MongoDB.toString(workspace._id) }, redirectUrl);
				} else {
					// if this user has no workspaces or multiple workspaces -> select/create one!
					redirectUrl = originUrl + Config.getBasePath("/workspace/select") + (shouldRedirect ? `?redirect_url=${redirectUrl}` : "");
					return signAndRedirect(res, { userId }, redirectUrl);
				}
			}

			// try to find this workspace in the database:
			workspace = await DB.findOne<IWorkspace>("workspace", { slug: workspaceSlug });
			if (!workspace) {
				if (user.workspaces && user.workspaces.length === 1) {
					// if this user only have 1 workspace -> make it active!
					workspace = isObjectId(user.workspaces[0])
						? await DB.findOne<IWorkspace>("workspace", { _id: user.workspaces[0] })
						: (user.workspaces[0] as IWorkspace);

					return signAndRedirect(res, { userId, workspaceId: MongoDB.toString(workspace._id) }, redirectUrl);
				} else {
					// if this user has no workspaces or multiple workspaces -> select/create one!
					redirectUrl = originUrl + Config.getBasePath("/workspace/select") + (shouldRedirect ? `?redirect_url=${redirectUrl}` : "");
					return signAndRedirect(res, { userId }, redirectUrl);
				}
			}

			// if found a workspace -> generate JWT access token:
			return signAndRedirect(res, { userId, workspaceId: MongoDB.toString(workspace._id) }, redirectUrl);
		}
	);

export default router;
