import { log, logError } from "diginext-utils/dist/xconsole/log";
import { existsSync } from "fs";
import path from "path";

import type { CreateEnvVarsDto } from "@/controllers/AppController";
import type { IApp } from "@/entities";
import { loadEnvFileAsContainerEnvVars } from "@/plugins";

import { fetchApi } from "../api";
import { DB } from "../api/DB";
import { askForProjectAndApp } from "../apps/ask-project-and-app";
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

export const uploadDotenvFileByApp = async (envFile: string, app: IApp, env: string = "dev") => {
	const { slug: appSlug } = app;

	const containerEnvVars = loadEnvFileAsContainerEnvVars(envFile);
	// log({ containerEnvVars });

	// update env vars to database:
	const updateAppData = {} as CreateEnvVarsDto;
	updateAppData.envVars = JSON.stringify(containerEnvVars);
	updateAppData.slug = appSlug;
	updateAppData.env = env;

	const url = `/api/v1/app/environment/variables`;
	// const updateData = flattenObjectPaths(updateAppData);

	const { status, data, messages } = await fetchApi({
		url,
		method: "POST",
		data: updateAppData,
	});

	let updatedApp: IApp;
	if (data && (data as IApp[]).length > 0) updatedApp = (data as IApp[])[0];
	// console.log("[DB] UPDATE > result :>> ", result);
	if (!status) logError(`Upload DOTENV file by app :>>`, messages);

	// const [updatedApp] = await DB.update<App>("app", { slug: appSlug }, updateAppData);
	if (!updatedApp) throw new Error(`Can't upload dotenv variables to "${env}" deploy environment of "${appSlug}" app.`);

	log(`Your local ENV variables (${containerEnvVars.length}) of "${appSlug}" app has been uploaded to ${env.toUpperCase()} deploy environment.`);
	return updatedApp;
};

export const uploadDotenvFileByAppSlug = async (envFile: string, appSlug: string, env: string = "dev") => {
	const app = await DB.findOne("app", { slug: appSlug });
	if (!app) throw new Error(`Can't upload dotenv variables to "${env}" deploy environment due to "${appSlug}" app not found.`);

	return uploadDotenvFileByApp(envFile, app, env);
};

export const uploadDotenvFile = async (env: string = "dev", options: UploadDotenvOptions = {}) => {
	const { targetDir = process.cwd(), fileName = `.env.${env}` } = options;

	const { app } = await askForProjectAndApp(targetDir);
	if (!app) throw new Error(`Unable to upload dotenv variables file to "${env}" deploy environment.`);

	const envFile = path.resolve(targetDir, fileName);
	if (!existsSync(envFile)) {
		throw new Error(`DOTENV file (${fileName}) is not existed.`);
	}

	// [SECURITY CHECK] warns if DOTENV files are not listed in ".gitignore" file
	await checkGitignoreContainsDotenvFiles({ targetDir });

	return uploadDotenvFileByApp(envFile, app, env);
};
