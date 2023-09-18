import bcrypt from "bcrypt";
import express from "express";
import { model } from "mongoose";

import { Config } from "@/app.config";
import type { IRole } from "@/entities";
import { type IUser, type IWorkspace, userSchema } from "@/entities";
import { respondFailure, respondSuccess } from "@/interfaces";
import { extractAccessTokenInfo, generateJWT } from "@/modules/passports";
import { MongoDB } from "@/plugins/mongodb";
import { UserService, WorkspaceService } from "@/services";

const router = express.Router();

/**
 * Basic auth - REGISTER: /api/v1/register
 */
router.post("/register", async (req, res) => {
	const { name, email, password, workspace: wsId } = req.body;
	// const { DB } = await import("@/modules/api/DB");
	const userSvc = new UserService();
	const wsSvc = new WorkspaceService();

	// validation
	if (!email) return res.json(respondFailure(`Email is required.`));
	if (!password) return res.json(respondFailure(`Password is required.`));

	try {
		let workspace: IWorkspace;
		let workspaceId: string;

		const existingUser = await userSvc.findOne({ email }, { populate: ["workspaces", "roles"] });
		if (existingUser) {
			if (wsId) {
				workspace = await wsSvc.findOne({ _id: wsId });
				workspaceId = MongoDB.toString(workspace._id);

				// validation
				if (!workspace) return res.json(respondFailure(`Invalid workspace.`));
				if (!workspace.public && !existingUser.workspaces.map((ws) => MongoDB.toString((ws as IWorkspace)._id)).includes(wsId))
					return res.json(respondFailure(`You need invitation to access this private workspace.`));

				// return res.json(respondFailure(`Workspace ID `));
			} else {
				return res.json(respondFailure(`Invalid credentials.`));
			}
		}

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// auto-generated name
		const userName = name || (email as string).split("@")[0];

		// Create/update a new user
		let newUser: IUser;
		if (existingUser) {
			// <-- invited user
			const updateData = { name: userName, password: hashedPassword };
			// await console.log("REGISTER > updateData :>> ", updateData);

			// TODO: NOT SURE WHY THE FIRST LINE IS NOT WORKING!!! ---> DEBUG LATER
			// const updatedUser = await userSvc.updateOne({ _id: existingUser._id }, updateData, { populate: ["workspaces", "roles"] });
			const userModel = model<IUser>("users", userSchema, "users");
			await userModel.updateOne({ _id: existingUser._id }, updateData);

			const updatedUser = await userSvc.findOne({ _id: existingUser._id }, { populate: ["workspaces", "roles"] });
			// console.log("REGISTER > updatedUser :>> ", updatedUser);

			newUser = updatedUser;
		} else {
			newUser = await userSvc.create({ name: userName, email, password: hashedPassword }, { populate: ["workspaces", "roles"] });
		}

		// console.log("REGISTER > newUser :>> ", newUser);

		// sign JWT and redirect
		const userId = MongoDB.toString(newUser._id);
		let access_token: string;
		let refresh_token: string;

		let redirectUrl = (req.query.state as string) || Config.BASE_URL;
		const originUrl = new URL(redirectUrl).origin;

		if (newUser.workspaces && newUser.workspaces.length === 1) {
			// if this user only have 1 workspace -> make it active!
			workspace = newUser.workspaces[0] as IWorkspace;
			workspaceId = MongoDB.toString(workspace._id);

			// active role
			const activeRoleId = (newUser.roles[0] as IRole)._id;

			// sign JWT
			const { accessToken, refreshToken } = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });
			const tokenInfo = await extractAccessTokenInfo(
				{ access_token: accessToken, refresh_token: refreshToken },
				{ id: userId, workspaceId, exp: Date.now() + 172800000 }
			);

			// update tokens to user info
			newUser = await userSvc.updateOne(
				{ _id: newUser._id },
				{ token: tokenInfo.token, activeWorkspace: workspaceId, activeRole: activeRoleId },
				{ populate: ["roles", "workspaces", "activeRole", "activeWorkspace"] }
			);

			access_token = accessToken;
			refresh_token = refreshToken;

			// assign JWT access token to cookie and request headers:
			res.cookie("x-auth-cookie", access_token);
			res.cookie("refresh_token", refresh_token);
			res.header("Authorization", `Bearer ${access_token}`);

			return res.json(respondSuccess({ data: { user: newUser, access_token, refresh_token } }));
		}

		// if this user has no workspaces or multiple workspaces -> select one!
		console.warn("this user has no workspaces or multiple workspaces -> select one!");

		// sign JWT (without "workspaceId")
		const { accessToken, refreshToken } = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d" });
		const tokenInfo = await extractAccessTokenInfo(
			{ access_token: accessToken, refresh_token: refreshToken },
			{ id: userId, exp: Date.now() + 172800000 }
		);

		// update tokens to user info
		newUser = await userSvc.updateOne({ _id: newUser._id }, { token: tokenInfo.token }, { populate: ["workspaces", "roles"] });
		access_token = accessToken;
		refresh_token = refreshToken;

		// assign JWT access token to cookie and request headers:
		res.cookie("x-auth-cookie", access_token);
		res.cookie("refresh_token", refresh_token);
		res.header("Authorization", `Bearer ${access_token}`);

		return res.json(respondSuccess({ data: { user: newUser, access_token, refresh_token } }));
	} catch (error) {
		console.error("Error during registration:", error);
		return res.json(respondFailure("Internal server error"));
	}
});

/**
 * Basic auth - LOGIN: /api/v1/login
 */
router.post(
	"/login",
	// recaptcha.middleware.verify,
	async (req, res) => {
		const { email, password } = req.body;
		const userSvc = new UserService();

		// validation
		if (!email) return res.json(respondFailure(`Email is required.`));
		if (!password) return res.json(respondFailure(`Password is required.`));

		try {
			let user = await userSvc.findOne({ email }, { populate: ["workspaces", "roles"] });
			if (!user) return res.json(respondFailure("Invalid credentials"));

			// account was authenticated by other methods
			if (!user.password) return res.json(respondFailure("This account is using other authentication method."));

			// Compare the provided password with the stored hashed password
			const passwordMatch = await bcrypt.compare(password, user.password);

			if (!passwordMatch) {
				return res.json(respondFailure("Invalid credentials."));
			}

			// sign JWT and redirect
			const userId = MongoDB.toString(user._id);
			let workspace: IWorkspace;
			let workspaceId: string;

			let redirectUrl = (req.query.state as string) || Config.BASE_URL;
			const originUrl = new URL(redirectUrl).origin;

			if (user.workspaces && user.workspaces.length === 1) {
				// if this user only have 1 workspace -> make it active!
				workspace = user.workspaces[0] as IWorkspace;
				workspaceId = MongoDB.toString(workspace._id);

				// active role
				const activeRoleId = (user.roles[0] as IRole)._id;

				// sign JWT
				const { accessToken, refreshToken } = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });
				const tokenInfo = await extractAccessTokenInfo(
					{ access_token: accessToken, refresh_token: refreshToken },
					{ id: userId, exp: Date.now() + 172800000 }
				);

				// update current user
				user = await userSvc.updateOne(
					{ _id: user._id },
					{ token: tokenInfo.token, activeWorkspace: workspaceId, activeRole: activeRoleId },
					{ populate: ["roles", "workspaces", "activeRole", "activeWorkspace"] }
				);

				// assign JWT access token to cookie and request headers:
				res.cookie("x-auth-cookie", accessToken);
				res.cookie("refresh_token", refreshToken);
				res.header("Authorization", `Bearer ${accessToken}`);

				return res.json(respondSuccess({ data: { user, access_token: accessToken, refresh_token: refreshToken } }));
			}

			// if this user has no workspaces or multiple workspaces -> select one!
			console.log("this user has no workspaces or multiple workspaces -> select one!");

			const { accessToken, refreshToken } = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d" });
			const tokenInfo = await extractAccessTokenInfo(
				{ access_token: accessToken, refresh_token: refreshToken },
				{ id: userId, exp: Date.now() + 172800000 }
			);

			user = await userSvc.updateOne({ _id: user._id }, { token: tokenInfo.token });

			// assign JWT access token to cookie and request headers:
			res.cookie("x-auth-cookie", accessToken);
			res.cookie("refresh_token", refreshToken);
			res.header("Authorization", `Bearer ${accessToken}`);

			return res.json(respondSuccess({ data: { user, access_token: accessToken, refresh_token: refreshToken } }));
		} catch (error) {
			console.error("Error during login:", error);
			return res.json(respondFailure("Internal server error"));
		}
	}
);

export default router;
