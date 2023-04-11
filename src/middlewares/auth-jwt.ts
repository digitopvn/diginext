// import { log } from "diginext-utils/dist/console/log";
import { Response } from "diginext-utils/dist/response";
import passport from "passport";

import type { Role, User, Workspace } from "@/entities";
import { respondFailure } from "@/interfaces";
import { DB } from "@/modules/api/DB";

/**
 * Why you don't need to care about this file?
 * ---
 * Because the {User} was already verified at "jwtStrategy" step before passing the token here!
 */
const jwt_auth = (req, res, next) =>
	passport.authenticate("jwt", { session: false }, async function (err, user: User, info) {
		// console.log(err, user, info);
		// console.log(`[2] AUTHORIZE: jwt_auth > assign token:`, user);

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
				} else {
					return respondFailure(`Unauthenticated: no active workspace.`);
				}
			}

			// role
			const { roles } = user;
			const activeRole = roles.find(
				(role) => (role as Role).workspace.toString() === (user.activeWorkspace as Workspace)?._id.toString() && !(role as Role).deletedAt
			) as Role;
			user.activeRole = activeRole;
			req.role = activeRole;

			// user
			req.user = user;
			res.locals.user = user;

			return next();
		}
	})(req, res, next);

export default jwt_auth;
