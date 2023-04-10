// import { log } from "diginext-utils/dist/console/log";
import { Response } from "diginext-utils/dist/response";
import passport from "passport";

import type { Role, Workspace } from "@/entities";

/**
 * Why you don't need to care about this file?
 * ---
 * Because the {User} was already verified at "jwtStrategy" step before passing the token here!
 */
const jwt_auth = (req, res, next) =>
	passport.authenticate("jwt", { session: false }, function (err, user, info) {
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
			// role
			const { roles } = user;
			const activeRole = roles.find(
				(role) => (role as Role).workspace.toString() === (user.activeWorkspace as Workspace)._id.toString() && !(role as Role).deletedAt
			) as Role;
			user.activeRole = activeRole;
			req.role = activeRole;

			// user
			req.user = user;
			res.locals.user = user;

			/**
			 * We can extract token from cookie / user (check "jwtStrategy.ts")
			 * Then re-assign it into the HTTP response
			 */
			// if (user.token?.access_token) {
			// 	res.cookie("x-auth-cookie", user.token.access_token);
			// 	res.header("Authorization", `Bearer ${user.token.access_token}`);
			// }

			return next();
		}
	})(req, res, next);

export default jwt_auth;
