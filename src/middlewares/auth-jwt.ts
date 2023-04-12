// import { log } from "diginext-utils/dist/console/log";
import { Response } from "diginext-utils/dist/response";
import passport from "passport";

import type { Role, User, Workspace } from "@/entities";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { DB } from "@/modules/api/DB";
import { MongoDB } from "@/plugins/mongodb";

/**
 * Why you don't need to care about this file?
 * ---
 * Because the {User} was already verified at "jwtStrategy" step before passing the token here!
 */
const jwt_auth = (req: AppRequest, res, next) =>
	passport.authenticate("jwt", { session: false }, async function (err, user: User, info) {
		// console.log(err, user, info);
		// console.log(`AUTHENTICATE: jwt_auth > assign token:`, user);

		if (!user) {
			/**
			 * If the token is expired or invalid,
			 * we should delete it in the cookies or HTTP response
			 */
			res.cookie("x-auth-cookie", "");
			res.header("Authorization", "");

			return info?.toString().indexOf("TokenExpiredError") > -1
				? Response.ignore(res, "Access token was expired.")
				: Response.ignore(res, info?.toString());
		} else {
			// check active workspace
			if (!user.activeWorkspace) {
				const workspaces = user.workspaces as Workspace[];
				if (workspaces.length === 1) {
					[user] = await DB.update<User>(
						"user",
						{ _id: user._id },
						{ activeWorkspace: workspaces[0]._id },
						{ populate: ["roles", "workspaces", "activeWorkspace"] }
					);
				}
				req.workspace = user.activeWorkspace as Workspace;
			}

			// role
			const { roles = [] } = user;
			const activeRole = roles.find(
				(role) =>
					MongoDB.toString((role as Role).workspace) === MongoDB.toString((user.activeWorkspace as Workspace)?._id) &&
					!(role as Role).deletedAt
			) as Role;

			// console.log("Unauthenticate :>> [2]");
			// if (!activeRole) return respondFailure(`Unauthorized: no active role.`);

			user.activeRole = activeRole;
			req.role = activeRole;

			// user
			req.user = user;
			res.locals.user = user;

			return next();
		}
	})(req, res, next);

export default jwt_auth;
