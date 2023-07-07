import bcrypt from "bcrypt";
import express from "express";

import { Config } from "@/app.config";
import type { IWorkspace } from "@/entities";
import { respondFailure, respondSuccess } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import { generateJWT } from "@/modules/passports";
import { MongoDB } from "@/plugins/mongodb";

const router = express.Router();

/**
 * Basic auth
 */
router.post("/register", async (req, res) => {
	const { email, password } = req.body;

	try {
		const existingUser = await DB.findOne("user", { email });
		if (existingUser) return res.json(respondFailure(`Email is existed.`));

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// auto-generated name
		const name = (email as string).split("@")[0];

		// Create a new user
		const newUser = await DB.create("user", { name, email, password: hashedPassword });

		// sign JWT and redirect
		let workspace: IWorkspace;
		const userId = MongoDB.toString(newUser._id);
		let workspaceId: string;
		let access_token: string;

		let redirectUrl = (req.query.state as string) || Config.BASE_URL;
		const originUrl = new URL(redirectUrl).origin;

		if (newUser.workspaces && newUser.workspaces.length === 1) {
			// if this user only have 1 workspace -> make it active!
			workspace = newUser.workspaces[0] as IWorkspace;
			workspaceId = MongoDB.toString(workspace._id);

			// sign JWT
			access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });

			// assign JWT access token to cookie and request headers:
			res.cookie("x-auth-cookie", access_token);
			res.header("Authorization", `Bearer ${access_token}`);

			return res.json(respondSuccess({ data: { user: newUser, access_token } }));
		}

		// if this user has no workspaces or multiple workspaces -> select one!
		console.log("this user has no workspaces or multiple workspaces -> select one!");

		access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d" });
		// assign JWT access token to cookie and request headers:
		res.cookie("x-auth-cookie", access_token);
		res.header("Authorization", `Bearer ${access_token}`);

		return res.json(respondSuccess({ data: { user: newUser, access_token } }));
	} catch (error) {
		console.error("Error during registration:", error);
		return res.json(respondFailure("Internal server error"));
	}
});

router.post(
	"/login",
	// recaptcha.middleware.verify,
	async (req, res) => {
		const { email, password } = req.body;

		try {
			const user = await DB.findOne("user", { email });
			if (!user) return res.json(respondFailure("Invalid credentials"));

			// account was authenticated by other methods
			if (!user.password) return res.json(respondFailure("This account is using other authentication method."));

			// Compare the provided password with the stored hashed password
			const passwordMatch = await bcrypt.compare(password, user.password);

			// if (!passwordMatch) {
			// 	// Check reCaptcha if failed more than 3 times
			// 	if (req.recaptcha.error) {
			// 		return res.status(401).json({ message: "Invalid credentials" });
			// 	}

			// 	return res.status(401).json({ message: "Invalid credentials. reCaptcha required." });
			// }

			if (!passwordMatch) {
				return res.json(respondFailure("Invalid credentials."));
			}

			// sign JWT and redirect
			let workspace: IWorkspace;
			const userId = MongoDB.toString(user._id);
			let workspaceId: string;
			let access_token: string;

			let redirectUrl = (req.query.state as string) || Config.BASE_URL;
			const originUrl = new URL(redirectUrl).origin;

			if (user.workspaces && user.workspaces.length === 1) {
				// if this user only have 1 workspace -> make it active!
				workspace = user.workspaces[0] as IWorkspace;
				workspaceId = MongoDB.toString(workspace._id);

				// sign JWT
				access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d", workspaceId });

				// assign JWT access token to cookie and request headers:
				res.cookie("x-auth-cookie", access_token);
				res.header("Authorization", `Bearer ${access_token}`);

				return res.json(respondSuccess({ data: { user, access_token } }));
			}

			// if this user has no workspaces or multiple workspaces -> select one!
			console.log("this user has no workspaces or multiple workspaces -> select one!");

			access_token = generateJWT(userId, { expiresIn: process.env.JWT_EXPIRE_TIME || "2d" });
			// assign JWT access token to cookie and request headers:
			res.cookie("x-auth-cookie", access_token);
			res.header("Authorization", `Bearer ${access_token}`);

			return res.json(respondSuccess({ data: { user, access_token } }));
		} catch (error) {
			console.error("Error during login:", error);
			return res.json(respondFailure("Internal server error"));
		}
	}
);

export default router;
