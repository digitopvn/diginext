// import passport from "passport";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type * as express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import type { VerifiedCallback } from "passport-jwt";
import { ExtractJwt, Strategy } from "passport-jwt";

import { Config } from "@/app.config";
import type { AccessTokenInfo, User } from "@/entities";
import type ServiceAccount from "@/entities/ServiceAccount";

import { DB } from "../api/DB";

dayjs.extend(relativeTime);

export type JWTOptions = {
	workspaceId?: string;
	expiresIn?: string | number;
};

var cookieExtractor = function (req) {
	var token = null;
	if (req && req.cookies) {
		token = req.cookies["x-auth-cookie"];
	}
	return token;
};

export const generateJWT = (userId: string, options?: JWTOptions) => {
	if (!options.expiresIn) options.expiresIn = process.env.JWT_EXPIRE_TIME || "2d";

	const { expiresIn } = options;

	const token = jwt.sign(
		{
			id: userId,
			...options,
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

function extractAccessTokenInfo(access_token: string, exp: number) {
	let expiredDate = dayjs(new Date(exp * 1000));
	let expiredTimestamp = dayjs(new Date(exp * 1000)).diff(dayjs());
	let isExpired = expiredTimestamp <= 0;
	// let expToNow = dayjs(new Date(exp * 1000)).fromNow();

	// log("Expired date >", expiredTimestamp, ">>:", expiredDate.format("YYYY-MM-DD HH:mm:ss"));
	// log(`Is token expired >>:`, isExpired, `(will expire ${expToNow})`);

	// If token is < 1 hour to expire, refresh it:
	// const expHourLeft = expiredTimestamp / 60 / 60 / 1000;
	// if (expHourLeft < 2) {
	// 	const userId = payload.id;
	// 	access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });

	// 	expiredDate = dayjs(new Date(payload.exp * 1000));
	// 	expiredTimestamp = dayjs(new Date(payload.exp * 1000)).diff(dayjs());
	// 	isExpired = expiredTimestamp <= 0;
	// 	expToNow = dayjs(new Date(payload.exp * 1000)).fromNow();

	// 	log(`The token is about to expired ${expToNow} > Refreshing it now...`);
	// }

	// assign "access_token" info to request:
	const token: AccessTokenInfo = {
		access_token,
		expiredTimestamp: expiredTimestamp,
		expiredDate: expiredDate.toDate(),
		expiredDateGTM7: expiredDate.format("YYYY-MM-DD HH:mm:ss"),
	};

	return { token, isExpired };
}

export const jwtStrategy = new Strategy(
	{
		secretOrKey: Config.grab("JWT_SECRET", "123"),
		jwtFromRequest: ExtractJwt.fromExtractors([
			ExtractJwt.fromAuthHeaderAsBearerToken(),
			ExtractJwt.fromUrlQueryParameter("access_token"),
			cookieExtractor,
		]),
		passReqToCallback: true,
		algorithms: ["HS512"],
	},
	async function (req: express.Request, payload: any, done: VerifiedCallback) {
		// console.log(`[1] AUTHENTICATE: jwtStrategy > extracting token...`, { payload });

		// const workspaceId = payload.workspaceId ? new ObjectId(payload.workspaceId) : undefined;

		let access_token = req.query.access_token || req.cookies["x-auth-cookie"] || req.headers.authorization?.split(" ")[1];
		// console.log("jwtStrategy > access_token :>> ", access_token);
		// console.log("jwtStrategy > payload :>> ", payload);
		// 1. Extract token info

		const tokenInfo = extractAccessTokenInfo(access_token, payload.exp);

		// validating token...
		if (tokenInfo.isExpired) return done(JSON.stringify({ status: 0, messages: ["Access token was expired."] }), null);
		if (!tokenInfo.token) return done(JSON.stringify({ status: 0, messages: ["Missing access token."] }), null);

		// 2. Check if this access token is from a {User} or a {ServiceAccount}

		let user = await DB.findOne<User | ServiceAccount>(
			"user",
			{ _id: new ObjectId(payload.id) },
			{ populate: ["roles", "workspaces", "activeWorkspace"] }
		);
		// console.log(`[1] jwtStrategy > User :>> `, user);

		if (user) {
			const updateData = {} as any;
			updateData.token = tokenInfo.token;

			// update the access token in database:
			[user] = await DB.update<User>("user", { _id: new ObjectId(payload.id) }, updateData, {
				populate: ["roles", "workspaces", "activeWorkspace"],
			});

			return done(null, user);
		}

		// Maybe it's not a normal user, try looking for {ServiceAccount} user:
		user = await DB.findOne<ServiceAccount>(
			"service_account",
			{ _id: new ObjectId(payload.id) },
			{ populate: ["roles", "workspaces", "activeWorkspace"] }
		);

		if (!user) return done(JSON.stringify({ status: 0, messages: ["Invalid user (probably deleted?)."] }), null);

		return done(null, user);
	}
);

// passport.use(jwtStrategy);
