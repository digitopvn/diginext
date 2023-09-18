// import { log } from "diginext-utils/dist/xconsole/log";
import { Response } from "diginext-utils/dist/response";
import { isEmpty } from "lodash";
import passport from "passport";

import type { IRole, IUser, IWorkspace } from "@/entities";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { generateJWT, verifyRefreshToken } from "@/modules/passports";
import { MongoDB } from "@/plugins/mongodb";

/**
 * Why you don't need to care about this file?
 * ---
 * Because the {User} was already verified at "jwtStrategy" step before passing the token here!
 */
const jwt_auth = (req: AppRequest, res, next) =>
	passport.authenticate("jwt", { session: false }, async function (err, user: IUser, info) {
		const { DB } = await import("@/modules/api/DB");
		// console.log(`[DEBUG] PASSPORT AUTHENTICATE:`, err, user, info);
		// console.log(`AUTHENTICATE: jwt_auth > user:`, user);

		if (!user) {
			/**
			 * If the token is expired or invalid,
			 * we should delete it in the cookies or HTTP response
			 */
			// res.cookie("x-auth-cookie", "");
			// res.header("Authorization", "");

			// check refresh token here:
			const isAccessTokenExpired = info?.toString().indexOf("TokenExpiredError") > -1;
			if (isAccessTokenExpired) {
				let refresh_token = req.query.refresh_token as string;
				// console.log("jwt_auth > refresh_token :>> ", refresh_token);

				const { error: isInvalidRefreshToken, tokenDetails: refreshTokenDetails } = await verifyRefreshToken(refresh_token);
				// console.log("jwt_auth > isInvalidRefreshToken :>> ", isInvalidRefreshToken);
				// console.log("jwt_auth > refreshTokenDetails :>> ", refreshTokenDetails);

				if (isInvalidRefreshToken || refreshTokenDetails.isExpired) return Response.ignore(res, "Access token was expired.");

				// refresh token is valid -> generate new access token
				// console.log("jwt_auth > refresh token is valid > generate new access token");
				const { accessToken, refreshToken } = generateJWT(refreshTokenDetails.id, {
					expiresIn: process.env.JWT_EXPIRE_TIME || "2d",
					workspaceId: refreshTokenDetails.workspaceId,
				});

				// assign new access token to cookie and request & response headers:
				res.cookie("x-auth-cookie", accessToken);
				res.cookie("refresh_token", refreshToken);
				res.header("Authorization", `Bearer ${accessToken}`);
				req.headers.authorization = `Bearer ${accessToken}`;
				delete req.headers.cookie;
				req.query.access_token = accessToken;
				req.query.refresh_token = refreshToken;

				return jwt_auth(req, res, next);
			}

			return isAccessTokenExpired ? Response.ignore(res, "Access token was expired.") : Response.ignore(res, info?.toString());
		} else {
			// check active workspace
			// console.log("user :>> ", user);
			if (!user.activeWorkspace) {
				const workspaces = user.workspaces as IWorkspace[];
				if (workspaces.length === 1) {
					user = await DB.updateOne(
						"user",
						{ _id: user._id },
						{ activeWorkspace: workspaces[0]._id },
						{ populate: ["roles", "workspaces", "activeWorkspace"] }
					);
				}
			}
			req.workspace = user.activeWorkspace as IWorkspace;
			// console.log("user.activeWorkspace :>> ", user.activeWorkspace);

			// role
			const { roles = [] } = user;
			const activeRole = isEmpty(user.activeWorkspace)
				? undefined
				: (roles.find(
						(role) => MongoDB.toString((role as IRole).workspace) === MongoDB.toString((user.activeWorkspace as IWorkspace)?._id)
				  ) as IRole);

			if (activeRole && user.activeRole !== activeRole._id) {
				user = await DB.updateOne(
					"user",
					{ _id: user._id },
					{ activeRole: activeRole._id },
					{ populate: ["roles", "workspaces", "activeRole", "activeWorkspace"] }
				);
			}

			// WHY????
			if (isEmpty(user.activeWorkspace)) delete user.activeWorkspace;
			if (isEmpty(user.activeRole)) delete user.activeRole;
			// if (isEmpty(user.activeWorkspace) && isEmpty(user.activeRole)) return Response.rejected(res, "Permissions denied.");

			req.role = user.activeRole = activeRole;

			// user
			req.user = user;
			res.locals.user = user;

			return next();
		}
	})(req, res, next);

export default jwt_auth;
