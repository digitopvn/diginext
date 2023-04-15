import chalk from "chalk";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { io } from "socket.io-client";

import { getCliConfig } from "@/config/config";
import type { IProject } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";
import { stageAllFiles } from "@/modules/bitbucket";
import { resolveDockerfilePath } from "@/plugins";

import { DB } from "../api/DB";
import { askForDeployEnvironmentInfo } from "./ask-deploy-environment-info";
import { parseOptionsToAppConfig } from "./parse-options-to-app-config";

/**
 * Request the build server to start building & deploying
 */
export async function requestDeploy(options: InputOptions) {
	if (process.env.CLI_MODE === "server") {
		logError(`This command is only available at CLIENT MODE.`);
		return;
	}

	if (!options.targetDirectory) options.targetDirectory = process.cwd();

	const { buildServerUrl } = getCliConfig();
	const { env, targetDirectory } = options;

	const appDirectory = targetDirectory;
	const DEPLOY_API_PATH = `${buildServerUrl}/api/v1/deploy`;

	// check Dockerfile -> no dockerfile, no build -> failed
	let dockerFile = resolveDockerfilePath({ targetDirectory: appDirectory, env });
	if (!dockerFile) return;

	/**
	 * [1] Parse cli options, validate the input params
	 *     and save it to "dx.json"
	 */
	let appConfig = await parseOptionsToAppConfig(options);
	if (!appConfig) return;

	/**
	 * [2] Compare LOCAL & SERVER App Config,
	 *     then upload local app config to server.
	 */
	const { deployEnvironment, appConfig: validatedAppConfig } = await askForDeployEnvironmentInfo(options);
	appConfig = validatedAppConfig;

	/**
	 * [3] Generate build number & build image as docker image tag
	 */
	const { imageURL } = deployEnvironment;
	options.buildNumber = makeDaySlug({ divider: "" });
	options.buildImage = `${imageURL}:${options.buildNumber}`;
	options.SOCKET_ROOM = `${appConfig.slug}-${options.buildNumber}`;
	const { SOCKET_ROOM } = options;

	/**
	 * [4] Stage, commit & push configuration files (dx.json) to GIT repository:
	 */
	try {
		await stageAllFiles({
			directory: options.targetDirectory,
			message: `build(${env}): ${options.buildImage}`,
		});
	} catch (e) {
		// Stop the process if this throws any errors
		logError(`Can't commit files for building this app: ${e}`);
		return;
	}

	/**
	 * [5] Notify the commander & call API to request server build:
	 */
	log(`Requesting BUILD SERVER to deploy this app: "${appConfig.project}/${appConfig.slug}"`);
	options.projectSlug = appConfig.project;
	options.appSlug = appConfig.slug;
	options.slug = appConfig.slug;

	// Make an API to request server to build:
	const deployOptions = JSON.stringify(options);
	try {
		fetchApi({
			url: DEPLOY_API_PATH,
			method: "POST",
			data: { options: deployOptions },
		});
	} catch (e) {
		logError(`Unexpected network error:`, e);
		return;
	}

	// update the project so it can be sorted on top
	try {
		await DB.update<IProject>("project", { slug: options.projectSlug }, { lastUpdatedBy: options.username });
	} catch (e) {
		logWarn(e);
	}

	log(`-> Check build status here: ${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM} `);
	if (env == "prod") log(chalk.red(`⚠️⚠️⚠️ REMEMBER TO CREATE PULL REQUEST TO "master" (or "main") BRANCH ⚠️⚠️⚠️`));

	if (options.isTail) {
		let socketURL = buildServerUrl.replace(/https/gi, "wss");
		socketURL = buildServerUrl.replace(/http/gi, "ws");
		const socket = io(socketURL, { transports: ["websocket"] });

		socket.on("error", (e) => logError(e));
		socket.on("connect_error", (e) => logError(e));

		socket.on("disconnect", () => {
			log("[CLI Server] Disconnected");
			socket.emit("leave", { room: SOCKET_ROOM });
			process.exit(1);
		});

		socket.on("connect", () => {
			log("[CLI Server] Connected");
			socket.emit("join", { room: SOCKET_ROOM });
		});

		return new Promise((resolve, reject) => {
			socket.on("message", ({ action, message }) => {
				if (message) {
					const errorWordIndex = message.toLowerCase().indexOf("error");
					if (errorWordIndex > -1) {
						logWarn(message);
					} else {
						log(message);
					}
				}
				if (action == "end") {
					socket.disconnect();
					resolve(true);
				}
			});

			// Max build duration: 30 mins
			setTimeout(reject, 30 * 60 * 1000);
		});
	} else {
		return true;
	}
}
