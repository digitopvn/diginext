// import passport from "passport";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type * as express from "express";
import jwt from "jsonwebtoken";
import type { VerifiedCallback } from "passport-jwt";
import { ExtractJwt, Strategy } from "passport-jwt";
import { z } from "zod";

import { Config } from "@/app.config";
import type { AccessTokenInfo } from "@/entities";

dayjs.extend(relativeTime);

// Zod schema for token validation
const TokenSchema = z.object({
	id: z.string().min(1, "User ID is required"),
	workspaceId: z.string().optional(),
	exp: z.number().optional(),
});

// Supported algorithms
const SUPPORTED_ALGORITHMS = ["HS256", "HS512"];

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

export interface TokenDetails {
	id: string;
	workspaceId: string;
	iat: number;
	exp: number;
	isExpired: boolean;
	expToNow: string;
	expiredTimestamp: number;
	expiredDate: Date;
	expiredDateGTM7: string;
}

export const verifyRefreshToken = async (refreshToken: string) => {
	try {
		// console.log("passports > verifyRefreshToken > Verifying token :>>", refreshToken);

		// Check if token exists
		if (!refreshToken) {
			return {
				error: true,
				message: "Refresh token is required",
			};
		}

		// Verify token's secret and decode
		const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "your_refresh_secret") as any;

		// Validate decoded token structure
		const validatedToken = TokenSchema.parse({
			id: decoded.id,
			workspaceId: decoded.workspaceId,
			exp: decoded.exp,
		});

		// Check token expiration
		const currentTime = Math.floor(Date.now() / 1000);
		const isExpired = decoded.exp ? decoded.exp < currentTime : true;

		if (isExpired) {
			return {
				error: true,
				message: "Refresh token has expired",
			};
		}

		return {
			error: false,
			tokenDetails: {
				id: validatedToken.id,
				workspaceId: validatedToken.workspaceId,
				isExpired: false,
			},
		};
	} catch (error) {
		console.error("passports > verifyRefreshToken > Error :>>", error);

		// Specific error handling
		if (error instanceof jwt.TokenExpiredError) {
			return {
				error: true,
				message: "Refresh token has expired",
			};
		}

		if (error instanceof jwt.JsonWebTokenError) {
			return {
				error: true,
				message: "Invalid refresh token signature",
			};
		}

		if (error instanceof z.ZodError) {
			return {
				error: true,
				message: "Invalid token structure",
			};
		}

		return {
			error: true,
			message: "Invalid refresh token",
		};
	}
};

// Companion function for generating refresh tokens
export const generateRefreshToken = (
	userId: string,
	options: {
		workspaceId?: string;
		expiresIn?: string;
	} = {}
) => {
	const { workspaceId, expiresIn = "7d" } = options;

	return jwt.sign(
		{
			id: userId,
			workspaceId,
		},
		process.env.JWT_REFRESH_SECRET || "your_refresh_secret",
		{
			expiresIn,
		}
	);
};

export const generateJWT = async (
	userId: string,
	options: {
		expiresIn?: string;
		workspaceId?: string;
	} = {}
) => {
	const { expiresIn = "2d", workspaceId } = options;

	const accessToken = jwt.sign(
		{
			id: userId,
			workspaceId,
		},
		process.env.JWT_SECRET || "your_secret",
		{
			expiresIn,
		}
	);

	const refreshToken = generateRefreshToken(userId, { workspaceId });

	return {
		accessToken,
		refreshToken,
	};
};

export async function extractAccessTokenInfo(
	tokens: { access_token: string; refresh_token?: string },
	payload: { id: string; exp: number; workspaceId?: string }
) {
	let { access_token, refresh_token } = tokens;
	const { exp, workspaceId } = payload;

	let expiredDate = dayjs(new Date(exp * 1000));
	let expiredTimestamp = dayjs(new Date(exp * 1000)).diff(dayjs());
	let isExpired = expiredTimestamp <= 0;
	let expToNow = dayjs(new Date(exp * 1000)).fromNow();

	// console.log("extractAccessTokenInfo() > Expired date >", expiredTimestamp, ">>:", expiredDate.format("YYYY-MM-DD HH:mm:ss"));
	// console.log(`extractAccessTokenInfo() > Is token expired >>:`, isExpired, `(will expire ${expToNow})`);

	if (refresh_token) {
		// If token is < 4 hours to expire, refresh it:
		const accessTokenExpHourLeft = expiredTimestamp / 60 / 60 / 1000;
		const { error: isInvalidRefreshToken, tokenDetails: refreshTokenDetails } = await verifyRefreshToken(refresh_token);
		// console.log("extractAccessTokenInfo() > accessTokenExpHourLeft :>> ", accessTokenExpHourLeft);
		// console.log("extractAccessTokenInfo() > refreshTokenDetails :>> ", refreshTokenDetails);
		// console.log("extractAccessTokenInfo() > isInvalidRefreshToken :>> ", isInvalidRefreshToken);

		if (isInvalidRefreshToken || refreshTokenDetails.isExpired) return { isExpired: true };

		if (accessTokenExpHourLeft < 4) {
			const userId = payload.id;
			const { accessToken, refreshToken } = await generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });
			access_token = accessToken;
			refresh_token = refreshToken;

			isExpired = false;
			expiredDate = dayjs(new Date(payload.exp * 1000));
			expiredTimestamp = dayjs(new Date(payload.exp * 1000)).diff(dayjs());
			expToNow = dayjs(new Date(payload.exp * 1000)).fromNow();

			// console.log(`The token of ${userId} is about to expired ${expToNow} > Refreshed it!`);
		}
	}

	// assign "access_token" info to request:
	const token: AccessTokenInfo = {
		access_token,
		refresh_token,
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
		algorithms: SUPPORTED_ALGORITHMS,
		passReqToCallback: true,
	},
	async function (req: express.Request, payload: any, done: VerifiedCallback) {
		// console.log(`[1] AUTHENTICATE: jwtStrategy > payload...`, payload);
		const { DB } = await import("@/modules/api/DB");

		let access_token = req.query.access_token || req.cookies["x-auth-cookie"] || req.headers.authorization?.split(" ")[1];
		let refresh_token = req.query.refresh_token as string;
		// console.log("jwtStrategy > access_token :>> ", access_token);
		// console.log("jwtStrategy > refresh_token :>> ", refresh_token);
		// console.log("jwtStrategy > payload :>> ", payload);
		// console.log(`[1] jwtStrategy > payload.id :>> `, payload.id);

		// 1. Extract token info
		const tokenInfo = await extractAccessTokenInfo({ access_token, refresh_token }, payload);
		// console.log("[DEBUG] jwtStrategy > tokenInfo :>> ", tokenInfo);

		// validating token...
		if (tokenInfo?.isExpired) return done(JSON.stringify({ status: 0, messages: ["Access token was expired."] }), null);
		if (!tokenInfo?.token) return done(JSON.stringify({ status: 0, messages: ["Missing access token."] }), null);

		// 2. Check if this access token is from a {User} or a {ServiceAccount}

		let user = await DB.findOne("user", { _id: payload.id }, { populate: ["roles", "workspaces", "activeWorkspace"], ignorable: true });
		// console.log("jwtStrategy > user :>> ", user);
		if (user) {
			const isAccessTokenExisted = await DB.count("user", { _id: payload.id, "token.access_token": tokenInfo.token.access_token });
			if (isAccessTokenExisted === 0) {
				user = await DB.updateOne(
					"user",
					{ _id: payload.id },
					{ token: tokenInfo.token },
					{
						populate: ["roles", "workspaces", "activeWorkspace"],
					}
				);
			}
			// user.token.refresh_token = tokenInfo.token.refresh_token;
			return done(null, user);
		}

		// Maybe it's not a normal user, try looking for {ServiceAccount} user:
		let serviceAccount = await DB.findOne(
			"service_account",
			{ _id: payload.id },
			{ populate: ["roles", "workspaces", "activeWorkspace"], ignorable: true }
		);

		if (!serviceAccount) return done(JSON.stringify({ status: 0, messages: ["Invalid service account (probably deleted?)."] }), null);

		return done(null, serviceAccount);
	}
);

// passport.use(jwtStrategy);
