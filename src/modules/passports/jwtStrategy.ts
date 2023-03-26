// import passport from "passport";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type * as express from "express";
import jwt from "jsonwebtoken";
import { isEmpty } from "lodash";
import { ObjectId } from "mongodb";
import type { VerifiedCallback } from "passport-jwt";
import { ExtractJwt, Strategy } from "passport-jwt";

import { Config } from "@/app.config";
import type { AccessTokenInfo } from "@/entities";
import UserService from "@/services/UserService";

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
	if (isEmpty(options.expiresIn)) options.expiresIn = process.env.JWT_EXPIRE_TIME || "2d";

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
		console.log(`[1] AUTHENTICATE: jwtStrategy > extract token`);
		// log(`req.headers :>>`, req.headers);
		// log(`req.query.access_token :>>`, req.query.access_token);
		let access_token = req.query.access_token || req.cookies["x-auth-cookie"] || req.headers.authorization?.split(" ")[1];
		// log(`access_token >>:`, access_token);
		// log(`JWT callback >>:`, payload);

		const tokenInfo = extractAccessTokenInfo(access_token, payload.exp);

		if (tokenInfo.isExpired) return done(JSON.stringify({ status: 0, messages: ["Access token was expired."] }), null);

		// 1. Check if this access token is Workspace API Access Token?

		// const workspaceFromApiAccessToken = await DB.findOne<Workspace>("workspace", { "apiAccessTokens.token": access_token });
		// if (workspaceFromApiAccessToken) {
		// 	const apiAccessToken = workspaceFromApiAccessToken.apiAccessTokens.find((apiToken) => apiToken.token === access_token);

		// 	// mock a {User} represent for this API Access Token
		// 	const mockedApiAccessTokenUser = new User();
		// 	mockedApiAccessTokenUser.name = mockedApiAccessTokenUser.slug = mockedApiAccessTokenUser.username = apiAccessToken.name;
		// 	mockedApiAccessTokenUser.email = `${access_token}@${workspaceFromApiAccessToken.slug}.${DIGINEXT_DOMAIN}`;
		// 	mockedApiAccessTokenUser.roles = apiAccessToken.roles;
		// 	mockedApiAccessTokenUser.token = tokenInfo.token;
		// 	mockedApiAccessTokenUser.active = true;
		// 	mockedApiAccessTokenUser.workspaces = [workspaceFromApiAccessToken];
		// 	mockedApiAccessTokenUser.activeWorkspace = workspaceFromApiAccessToken;
		// 	mockedApiAccessTokenUser.createdAt = workspaceFromApiAccessToken.createdAt;
		// 	mockedApiAccessTokenUser.updatedAt = workspaceFromApiAccessToken.updatedAt;

		// 	return done(null, mockedApiAccessTokenUser);
		// }

		// 2. Check if this access token is {User} or {ServiceAccount}

		const userSvc = new UserService();
		let user = await userSvc.findOne({ _id: new ObjectId(payload.id) }, { populate: ["roles", "workspaces", "activeWorkspace"] });
		if (!user) done(null, false);

		// assign token for user:
		user.token = tokenInfo.token;

		return done(null, user);
	}
);

// passport.use(jwtStrategy);
