import chalk from "chalk";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { log, logError, logWarn } from "diginext-utils/dist/xconsole/log";
import { io } from "socket.io-client";

import { getCliConfig } from "@/config/config";
import type { DeployBuildParams } from "@/controllers/DeployController";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";
import { currentVersion, resolveDockerfilePath } from "@/plugins";

import type { StartBuildParams } from "../build";
import { stageCommitAndPushAll } from "../git/git-utils";
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
	const { DB } = await import("@/modules/api/DB");

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
	 *     and save it to deploy environment config on Diginext workspace
	 */
	let appConfig = await parseOptionsToAppConfig(options);
	if (!appConfig) return;

	if (options.isDebugging) {
		console.log("Request deploy > app config :>>");
		console.dir(appConfig, { depth: 10 });
	}

	/**
	 * [2] Compare LOCAL & SERVER App Config,
	 *     then upload local app config to server.
	 */
	const deployInfo = await askForDeployEnvironmentInfo(options);
	if (options.isDebugging) console.log("deployInfo :>> ", deployInfo);
	if (!deployInfo.appConfig || !deployInfo.deployEnvironment) return;

	const { deployEnvironment, appConfig: validatedAppConfig } = deployInfo;
	appConfig = validatedAppConfig;

	if (options.isDebugging) {
		console.log("requestDeploy >  app config :>>");
		console.dir(appConfig, { depth: 10 });
		console.log("requestDeploy > deployEnvironment :>>");
		console.dir(deployEnvironment, { depth: 10 });
	}

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
		await stageCommitAndPushAll({
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
	const requestDeployData: { buildParams: StartBuildParams; deployParams: DeployBuildParams } = {
		buildParams: {
			env,
			buildNumber: options.buildNumber,
			gitBranch: options.gitBranch,
			registrySlug: deployEnvironment.registry,
			appSlug: options.appSlug,
			cliVersion: currentVersion(),
		},
		deployParams: {
			env,
			shouldUseFreshDeploy: options.shouldUseFreshDeploy,
		},
	};

	if (options.isDebugging) {
		console.log("Request deploy data :>> ");
		console.dir(requestDeployData, { depth: 10 });
	}

	try {
		const requestResult = await fetchApi({
			url: `${buildServerUrl}/api/v1/deploy/from-source`,
			method: "POST",
			data: requestDeployData,
		});

		if (options.isDebugging) {
			console.log("Request deploy result :>> ");
			console.dir(requestResult, { depth: 10 });
		}

		if (!requestResult.status) logError(requestResult.messages[0] || `Unable to call Request Deploy API.`);

		console.log("requestResult.data :>> ", requestResult.data);
		const defaultLogURL = `${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM}&env=${env}`;
		log(`-> Check build status here: ${requestResult?.data?.logURL || defaultLogURL} `);
	} catch (e) {
		logError(`Unable to call Request Deploy API:`, e);
		return;
	}

	// update the project so it can be sorted on top
	try {
		await DB.updateOne("project", { slug: options.projectSlug }, { lastUpdatedBy: options.username });
	} catch (e) {
		logWarn(e);
	}

	// friendly reminder
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
