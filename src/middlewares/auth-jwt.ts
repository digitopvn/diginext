import type express from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { isEmpty } from "lodash";
import passport from "passport";

import type { IRole, IUser, IWorkspace } from "@/entities";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { generateJWT, verifyRefreshToken } from "@/modules/passports";
import { MongoDB } from "@/plugins/mongodb";

const sendAuthErrorResponse = (res: express.Response, message: string, statusCode: number = 401, errorCode: string = "UNAUTHORIZED") => {
	res.status(statusCode)
		.header("Content-Type", "application/json")
		.json({
			status: 0,
			error: true,
			messages: [message],
			errorCode,
			timestamp: new Date().toISOString(),
		});
};

/**
 * Why you don't need to care about this file?
 * ---
 * Because the {User} was already verified at "jwtStrategy" step before passing the token here!
 */
const jwt_auth = (req: AppRequest, res, next) =>
	passport.authenticate("jwt", { session: false }, async function (err, user: IUser, info) {
		try {
			// Detailed logging for development
			console.log("auth-jwt > authentication details :>>", {
				hasError: !!err,
				userExists: !!user,
				info: info?.toString(),
			});

			const { UserService } = await import("@/services");
			const userSvc = new UserService();

			if (!user) {
				/**
				 * If the token is expired or invalid,
				 * we should delete it in the cookies or HTTP response
				 */
				res.cookie("x-auth-cookie", "");
				res.header("Authorization", "");
				delete req.headers.cookie;

				// check refresh token here:
				const isAccessTokenExpired = info?.toString().indexOf("TokenExpiredError") > -1;
				if (isAccessTokenExpired) {
					let refresh_token = req.query.refresh_token as string;
					console.log("jwt_auth > refresh_token :>> ", refresh_token);

					if (!refresh_token) {
						return sendAuthErrorResponse(res, "Refresh token is required.", 401, "MISSING_REFRESH_TOKEN");
					}

					try {
						const { error: isInvalidRefreshToken, tokenDetails: refreshTokenDetails } = await verifyRefreshToken(refresh_token);

						// More explicit error handling
						if (isInvalidRefreshToken) {
							console.error("jwt_auth > Invalid refresh token :>>", refresh_token);
							return sendAuthErrorResponse(res, "Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
						}

						if (refreshTokenDetails.isExpired) {
							console.error("jwt_auth > Expired refresh token :>>", refresh_token);
							return sendAuthErrorResponse(res, "Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
						}

						// refresh token is valid -> generate new access token
						const { accessToken, refreshToken } = await generateJWT(refreshTokenDetails.id, {
							expiresIn: process.env.JWT_EXPIRE_TIME || "2d",
							workspaceId: refreshTokenDetails.workspaceId,
						});

						// assign new access token to cookie and request & response headers:
						res.cookie("x-auth-cookie", accessToken);
						res.cookie("refresh_token", refreshToken);
						res.header("Authorization", `Bearer ${accessToken}`);
						req.headers.authorization = `Bearer ${accessToken}`;
						req.query.access_token = accessToken;
						req.query.refresh_token = refreshToken;

						return jwt_auth(req, res, next);
					} catch (e) {
						console.error("jwt_auth > Refresh token error :>>", {
							error: e,
							refreshToken: refresh_token,
							timestamp: new Date().toISOString(),
						});

						// More specific error handling
						if (e instanceof TokenExpiredError) {
							return sendAuthErrorResponse(res, "Token has expired", 401, "TOKEN_EXPIRED");
						}

						if (e instanceof JsonWebTokenError) {
							return sendAuthErrorResponse(res, "Invalid token signature", 401, "INVALID_TOKEN_SIGNATURE");
						}

						return sendAuthErrorResponse(res, "Unexpected authentication error", 401, "UNEXPECTED_AUTH_ERROR");
					}
				}

				return sendAuthErrorResponse(res, "Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
			} else {
				// check active workspace
				if (!user.activeWorkspace) {
					const workspaces = user.workspaces as IWorkspace[];
					if (workspaces.length === 1) {
						user = await userSvc.updateOne(
							{ _id: user._id },
							{ activeWorkspace: workspaces[0]._id },
							{ populate: ["roles", "workspaces", "activeWorkspace"] }
						);
					}
				}
				req.workspace = user.activeWorkspace as IWorkspace;

				// role
				const { roles = [] } = user;
				const workspaceId = MongoDB.toString(req.workspace._id);
				const activeRole = isEmpty(user.activeWorkspace)
					? undefined
					: (roles.find((role) => MongoDB.toString((role as IRole).workspace) === workspaceId) as IRole);

				if (activeRole && user.activeRole !== activeRole._id) {
					user = await userSvc.updateOne(
						{ _id: user._id },
						{ activeRole: activeRole._id },
						{ populate: ["roles", "workspaces", "activeRole", "activeWorkspace"] }
					);
				}

				// Clean up empty workspace and role
				if (isEmpty(user.activeWorkspace)) delete user.activeWorkspace;
				if (isEmpty(user.activeRole)) delete user.activeRole;

				req.role = user.activeRole = activeRole;

				// user
				req.user = user;
				res.locals.user = user;

				// try to assign tokens to cookies (test)
				try {
					const { access_token: accessToken, refresh_token: refreshToken } = user.token || {};
					if (accessToken && refreshToken) {
						res.cookie("x-auth-cookie", accessToken);
						res.cookie("refresh_token", refreshToken);
						res.header("Authorization", `Bearer ${accessToken}`);
						req.headers.authorization = `Bearer ${accessToken}`;
						req.query.access_token = accessToken;
						req.query.refresh_token = refreshToken;
					}
				} catch (e) {
					console.error(`[AUTH_JWT] Unable to assign tokens to cookies: ${e.stack}`);
					return sendAuthErrorResponse(res, "Failed to assign tokens", 401, "FAILED_TO_ASSIGN_TOKENS");
				}

				next();
			}
		} catch (globalError) {
			console.error("jwt_auth > Unexpected global error :>>", {
				error: globalError,
				timestamp: new Date().toISOString(),
			});
			return sendAuthErrorResponse(res, "Unexpected error during authentication", 401, "UNEXPECTED_AUTH_ERROR");
		}
	})(req, res, next);

export default jwt_auth;
