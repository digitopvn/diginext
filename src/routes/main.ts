import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import express from "express";

import pkg from "@/../package.json";

import { Config } from "../app.config";

dayjs.extend(timezone);

import cliApi from "@/routes/api/index";
import apiV1 from "@/routes/api/v1";

import googleAuth from "./auth/google";
import authProfileApi from "./auth/profile";

const router = express.Router();

const defaultHTML = () => `<!DOCTYPE html>
<html>
	<body>
		<h1>${pkg.name}</h1>
		<ul>
			<li>TIMEZONE: <strong>${process.env.TZ || dayjs.tz.guess()}</strong></li>
			<li>DATETIME: <strong>${dayjs().format()}</strong></li>
			<li>VERSION: <strong>${pkg.version}</strong></li>
		</ul>
	</body>
</html>`;

// define the home page route
router.get("/", (req, res) => res.send(defaultHTML()));

/**
 * Register routes
 */
router.use(Config.getBasePath(`/auth/profile`), authProfileApi);
router.use(Config.getBasePath(`/auth/google`), googleAuth);

if (cliApi) {
	const deployApiPath = Config.getBasePath(`/api`);
	router.use(deployApiPath, cliApi);
}

if (apiV1) {
	router.use(Config.getBasePath(`/api/v1`), apiV1);
}

export default router;
