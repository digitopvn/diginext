import { log } from "diginext-utils/dist/console/log";
import { existsSync } from "fs";
import path from "path";

import type { App } from "@/entities";
import type { DeployEnvironment } from "@/interfaces";
import { getAppConfig, loadEnvFileAsContainerEnvVars } from "@/plugins";

import { DB } from "../api/DB";
import { checkGitignoreContainsDotenvFiles } from "./dotenv-exec";

type UploadDotenvOptions = {
	/**
	 * Location to write down the dotenv file
	 * @default process.cwd()
	 */
	targetDir?: string;
	/**
	 * Output file name
	 * @default `.env.{env}`
	 * @example ".env.dev" | ".env.prod"
	 */
	fileName?: string;
};

export const uploadDotenvFileByApp = async (envFile: string, app: App, env: string = "dev") => {
	const { slug: appSlug } = app;

	const containerEnvVars = loadEnvFileAsContainerEnvVars(envFile);
	// log({ containerEnvVars });

	// update env vars to database:
	const updateAppData = { deployEnvironment: app.deployEnvironment || {} } as App;
	updateAppData.deployEnvironment[env] = { envVars: containerEnvVars } as DeployEnvironment;

	const [updatedApp] = await DB.update<App>("app", { slug: appSlug }, updateAppData);
	if (!updatedApp) throw new Error(`Can't upload dotenv variables to "${env}" deploy environment of "${appSlug}" app.`);

	log(`Your local ENV variables (${containerEnvVars.length}) of "${appSlug}" app has been uploaded to ${env.toUpperCase()} deploy environment.`);
	return updatedApp;
};

export const uploadDotenvFileByAppSlug = async (envFile: string, appSlug: string, env: string = "dev") => {
	const app = await DB.findOne<App>("app", { slug: appSlug });
	if (!app) throw new Error(`Can't upload dotenv variables to "${env}" deploy environment due to "${appSlug}" app not found.`);

	return uploadDotenvFileByApp(envFile, app, env);
};

export const uploadDotenvFile = async (env: string = "dev", options: UploadDotenvOptions = {}) => {
	const { targetDir = process.cwd(), fileName = `.env.${env}` } = options;

	const appConfig = getAppConfig(targetDir);

	const { slug: appSlug } = appConfig;
	if (!appSlug) {
		throw new Error(`Invalid working directory, the current "dx.json" might be corrupted, please re-initialize.`);
	}

	const app = await DB.findOne<App>("app", { slug: appSlug });
	if (!app) throw new Error(`Can't upload dotenv variables to "${env}" deploy environment due to "${appSlug}" app not found.`);

	const envFile = path.resolve(targetDir, fileName);
	if (!existsSync(envFile)) {
		throw new Error(`DOTENV file (${fileName}) is not existed.`);
	}

	// [SECURITY CHECK] warns if DOTENV files are not listed in ".gitignore" file
	await checkGitignoreContainsDotenvFiles({ targetDir });

	return uploadDotenvFileByApp(envFile, app, env);
};
