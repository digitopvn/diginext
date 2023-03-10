// import { log } from "diginext-utils/dist/console/log";
import { Response } from "diginext-utils/dist/response";
import isEmpty from "lodash/isEmpty";
import passport from "passport";

const jwt_auth = (req, res, next) =>
	passport.authenticate("jwt", { session: false }, function (err, user, info) {
		// console.log(err, user, info);
		// console.log(req);

		if (err || !user || isEmpty(user)) {
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
			req.isAuthenticated = true;
			req.user = user;
			res.locals.user = user;

			/**
			 * We can extract token from cookie / user (check "jwtStrategy.ts")
			 * Then re-assign it into the HTTP response
			 */
			if (req.token?.access_token) {
				res.cookie("x-auth-cookie", req.token.access_token);
				res.header("Authorization", `Bearer ${req.token.access_token}`);
			}

			// console.log(req);

			return next();
		}
	})(req, res, next);

export default jwt_auth;
