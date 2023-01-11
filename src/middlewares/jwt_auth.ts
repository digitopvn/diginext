// import { log } from "diginext-utils/dist/console/log";
import { Response } from "diginext-utils/dist/response";
import isEmpty from "lodash/isEmpty";
import passport from "passport";

const jwt_auth = (req, res, next) => {
	// log(req.query.access_token);
	const authentication = passport.authenticate("jwt", { session: false }, function (err, user, info) {
		// log(err, user, info);

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

			/**
			 * We can extract token from cookie / user (check "jwtStrategy.ts")
			 * Then re-assign it into the HTTP response
			 */
			if (user.token) {
				res.cookie("x-auth-cookie", user.token.access_token);
				res.header("Authorization", `Bearer ${user.token.access_token}`);
			}

			return next();
		}
	})(req, res, next);

	return authentication;
};

export default jwt_auth;
