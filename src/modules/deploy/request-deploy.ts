import { readFileSync } from "node:fs";

import chalk from "chalk";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import { io } from "socket.io-client";

import { getCliConfig } from "@/config/config";
import type { DeployBuildParams } from "@/controllers/DeployController";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";
import { currentVersion, resolveDockerfilePath, resolveFilePath } from "@/plugins";

import type { StartBuildParams } from "../build";
import { generateBuildTagBySourceDir } from "../build/generate-build-tag";
import { getServerInfo } from "../cli/get-server-info";
import { isUnstagedFiles } from "../git/git-utils";
import { askAiGenerateDockerfile } from "./ask-ai-generate-dockerfile";
import { askForDeployEnvironmentInfo } from "./ask-deploy-environment-info";
import { createBuildSlug } from "./create-build-slug";
import { parseOptionsToAppConfig } from "./parse-options-to-app-config";

/**
 * Request the build server to start building & deploying
 */
export async function requestDeploy(options: InputOptions) {
	if (process.env.CLI_MODE === "server") {
		logError(`This command is only available at CLIENT MODE.`);
		return;
	}

	if (!options) return logError(`Failed to request deploying app: Missing CLI options.`);

	const { DB } = await import("@/modules/api/DB");

	if (!options.targetDirectory) options.targetDirectory = process.cwd();

	if (options.isDebugging) console.log("requestDeploy() > options.targetDirectory :>> ", options.targetDirectory);

	const { buildServerUrl } = getCliConfig();
	const { env, targetDirectory, projectSlug, appSlug } = options;

	// check Dockerfile -> no dockerfile, no build -> failed
	let dockerFile = resolveDockerfilePath({ targetDirectory, env, ignoreIfNotExisted: true });
	if (options.isDebugging) console.log("requestDeploy() > dockerFile :>> ", dockerFile);
	if (!dockerFile) {
		// ask to use AI for generating "Dockerfile"
		await askAiGenerateDockerfile(options);
		dockerFile = resolveDockerfilePath({ targetDirectory, env });

		let successMsg = `Double check your ${chalk.yellow(`"Dockerfile.${env}"`)}, test building container locally, for example:`;
		successMsg += `\n  ${chalk.cyan(`$ docker build -t ${projectSlug}/${appSlug} -f Dockerfile.${env} .`)}`;
		successMsg += `\n  ${chalk.cyan(`$ docker run -p <host_port>:<container_port> ${projectSlug}/${appSlug}`)}`;
		successMsg += `\n  ${chalk.gray(`# access: http://localhost:<host_port>`)}`;
		successMsg += `\nIf everything is good, commit & push the changes to the git remote origin, then deploy again:`;
		successMsg += `\n  ${chalk.cyan(`$ dx up --${env}`)}`;
		successMsg += `\nHave fun!`;
		logSuccess(successMsg);
		return;
	}

	// [SECURITY] Check ".dockerignore"
	let dockerIgnoreFile = resolveFilePath(".dockerignore", {
		targetDirectory,
		env,
		msg: `You should have ".dockerignore" file and exclude ".git/" directory or any sensitive directories/files for security reason.`,
		ignoreIfNotExisted: true,
	});
	if (dockerIgnoreFile) {
		const dockerIgnoreContent = readFileSync(dockerIgnoreFile, "utf8");
		if (dockerIgnoreContent.indexOf(".git") === -1) {
			logError(`You need to add ".git/" to your ".dockerignore" file due to security reason.`);
			return;
		}
	}

	// Warn about uncommited files
	const shouldShowGitWarning = await isUnstagedFiles(options.targetDirectory);
	if (shouldShowGitWarning) logWarn(`Please stage files & commit before deploying.`);

	/**
	 * [1] Parse cli options, validate the input params
	 *     and save it to deploy environment config on Diginext workspace
	 */
	let appConfig = await parseOptionsToAppConfig(options);
	if (!appConfig) return;

	if (options.isDebugging) {
		console.log("requestDeploy() > appConfig :>>");
		console.dir(appConfig, { depth: 10 });
	}

	/**
	 * [2] Compare LOCAL & SERVER App Config,
	 *     then upload local app config to server.
	 */
	// console.log("requestDeploy() > options.author :>> ", options.author);
	const deployInfo = await askForDeployEnvironmentInfo(options);
	if (options.isDebugging) console.log("requestDeploy() > askForDeployEnvironmentInfo() :>> ", deployInfo);
	if (!deployInfo.appConfig || !deployInfo.deployEnvironment) return;

	const { deployEnvironment, appConfig: validatedAppConfig } = deployInfo;
	appConfig = validatedAppConfig;

	if (options.isDebugging) {
		console.log("requestDeploy() > appConfig :>>");
		console.dir(appConfig, { depth: 10 });
		console.log("requestDeploy() > deployEnvironment :>>");
		console.dir(deployEnvironment, { depth: 10 });
	}

	/**
	 * [3] Generate build number & build image as docker image tag
	 */
	const { imageURL } = deployEnvironment;
	const tagInfo = await generateBuildTagBySourceDir(options.targetDirectory, { branch: options.gitBranch });
	if (options.isDebugging) console.log("requestDeploy() > generateBuildTagBySourceDir() :>> ", tagInfo);
	options.buildTag = tagInfo.tag;
	options.buildImage = `${imageURL}:${options.buildTag}`;
	options.SOCKET_ROOM = createBuildSlug({ projectSlug: appConfig.project, appSlug: appConfig.slug, buildTag: options.buildTag });
	const { SOCKET_ROOM } = options;

	/**
	 * [5] Notify the commander & call API to request server build:
	 */
	log(`Requesting BUILD SERVER to deploy this app: "${appConfig.project}/${appConfig.slug}/${env}"`);
	options.projectSlug = appConfig.project;
	options.appSlug = appConfig.slug;
	options.slug = appConfig.slug;

	/**
	 * [6] Get server info
	 */
	const { version: serverVersion, location: serverLocation } = await getServerInfo();
	if (options.isDebugging) console.log("requestDeploy() > getServerInfo() :>> ", { serverVersion, serverLocation });

	// Make an API to request server to build:
	const requestDeployData: { buildParams: StartBuildParams; deployParams: DeployBuildParams } = {
		buildParams: {
			env,
			buildTag: options.buildTag,
			buildNumber: tagInfo.number,
			message: options.message,
			gitBranch: options.gitBranch,
			registrySlug: deployEnvironment.registry,
			appSlug: options.appSlug,
			cliVersion: currentVersion(),
			serverVersion,
			serverLocation,
		},
		deployParams: {
			env,
			forceRollOut: options.shouldRollOut,
			skipReadyCheck: false,
			shouldUseFreshDeploy: options.shouldUseFreshDeploy,
			healthzPath: options.healthz,
		},
	};

	if (options.isDebugging) {
		console.log("Request deploy data :>> ");
		console.dir(requestDeployData, { depth: 10 });
	}

	try {
		const url = `${buildServerUrl}/api/v1/deploy/from-source`;
		if (options.isDebugging) console.log("requestDeploy() > deploy API url :>> ", url);
		const requestResult = await fetchApi({
			url,
			method: "POST",
			data: requestDeployData,
		});

		if (options.isDebugging) {
			console.log("requestDeploy() > Request deploy result :>> ");
			console.dir(requestResult, { depth: 10 });
		}

		// check errors
		if (!requestResult.status) {
			logError(`Failed to request server to build & deploy: ${requestResult.messages.join("\n")}` || `Unable to call Request Deploy API.`);
			return;
		}

		if (options?.isDebugging) console.log("requestResult.data :>> ", requestResult.data);
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

		let pingInt;

		const socket = io(socketURL, {
			transports: ["websocket"],
			timeout: 60000,
			requestTimeout: 60000,
		});
		socket.on("error", (e) => logError(e));
		socket.on("connect_error", (e) => logError(e));

		const ping = () => {
			const start = Date.now();
			socket.emit("ping", (location) => {
				const duration = Date.now() - start;
				console.log(`[DXUP Websocket] Ping: ${duration}ms - ${socketURL}${location ? ` (${location})` : ""}`);
			});
		};

		socket.on("disconnect", () => {
			log("[DXUP Websocket] Disconnected.");
			socket.emit("leave", { room: SOCKET_ROOM });
			clearInterval(pingInt);
		});

		socket.on("connect", () => {
			log("[DXUP Websocket] Connected.");
			socket.emit("join", { room: SOCKET_ROOM });

			clearInterval(pingInt);
			pingInt = setInterval(ping, 15 * 1000);
			ping();
		});

		return new Promise((resolve, reject) => {
			socket.on("message", ({ action, message, type }) => {
				if (message) {
					const errorWordIndex = message.toLowerCase().indexOf("error");
					if (errorWordIndex > -1) {
						console.warn(message);
					} else {
						console.log(message);
					}
				}
				if (action == "end") {
					socket.disconnect();
					if (type === "error") {
						// process.exit(1);
						reject(message);
					} else {
						// process.exit(0);
						resolve(true);
					}
				}
			});

			// Max build duration: 60 mins
			setTimeout(() => reject(`[DXUP Websocket] Request timeout (>60 minutes)`), 60 * 60 * 1000);
		});
	} else {
		return true;
	}
}
