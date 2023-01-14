// import passport from "passport";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { log } from "diginext-utils/dist/console/log";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { ExtractJwt, Strategy } from "passport-jwt";

import { Config } from "@/app.config";
import UserService from "@/services/UserService";

dayjs.extend(relativeTime);

export type JWTOptions = {
	expiresIn: string | number;
};

var cookieExtractor = function (req) {
	var token = null;
	if (req && req.cookies) {
		token = req.cookies["x-auth-cookie"];
	}
	return token;
};

export const generateJWT = (userId: string, options?: JWTOptions) => {
	const { expiresIn = "2d" } = options;
	const token = jwt.sign(
		{
			id: userId,
			expiresIn,
			// exp: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60, // 2d
		},
		Config.grab("JWT_SECRET", "123"),
		{
			algorithm: "HS512",
			expiresIn,
		}
	);
	return token;
};

export const refreshAccessToken = () => {};

export const jwtStrategy = new Strategy(
	{
		secretOrKey: Config.grab("JWT_SECRET", "123"),
		jwtFromRequest: ExtractJwt.fromExtractors([
			ExtractJwt.fromAuthHeaderAsBearerToken(),
			ExtractJwt.fromUrlQueryParameter("access_token"),
			cookieExtractor,
		]),
		// jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
		passReqToCallback: true,
		algorithms: ["HS512"],
	},
	async function (req, payload, done) {
		// log(`req.headers :>>`, req.headers);
		let access_token = req.query.access_token || req.cookies["x-auth-cookie"] || req.headers.authorization?.split(" ")[1];
		// log(`access_token >>:`, access_token);
		// log(`JWT callback >>:`, payload);

		let expiredDate = dayjs(new Date(payload.exp * 1000));
		let expiredTimestamp = dayjs(new Date(payload.exp * 1000)).diff(dayjs());
		let isExpired = expiredTimestamp <= 0;
		let expToNow = dayjs(new Date(payload.exp * 1000)).fromNow();

		// log("Expired date >", expiredTimestamp, ">>:", expiredDate.format("YYYY-MM-DD HH:mm:ss"));
		// log(`Is token expired >>:`, isExpired, `(will expire ${expToNow})`);

		// If token is < 1 hour to expire, refresh it:
		const expHourLeft = expiredTimestamp / 60 / 60 / 1000;
		if (expHourLeft < 2) {
			const userId = payload.id;
			access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "24h" });

			expiredDate = dayjs(new Date(payload.exp * 1000));
			expiredTimestamp = dayjs(new Date(payload.exp * 1000)).diff(dayjs());
			isExpired = expiredTimestamp <= 0;
			expToNow = dayjs(new Date(payload.exp * 1000)).fromNow();

			log(`The token is about to expired ${expToNow} > Refreshing it now...`);
		}

		// assign "access_token" info to request:
		req.token = {
			access_token,
			expiredTimestamp: expiredTimestamp,
			expiredDate: expiredDate.toDate(),
			expiredDateGTM7: expiredDate.format("YYYY-MM-DD HH:mm:ss"),
		};

		if (isExpired) {
			return done(JSON.stringify({ status: 0, messages: ["Access token was expired."] }), null);
		}

		const userSvc = new UserService();
		let user = await userSvc.findOne({ _id: new ObjectId(payload.id) }, { populate: ["roles", "workspaces"] });

		if (user) return done(null, user);

		done(null, false);
	}
);

// passport.use(jwtStrategy);
