import chalk from "chalk";
import { log, logError, logWarn } from "diginext-utils/dist/xconsole/log";
import { io } from "socket.io-client";

import { getCliConfig } from "@/config/config";
import type { AppGitInfo, IApp, IContainerRegistry, IProject } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { fetchApi } from "@/modules/api/fetchApi";
import { getCurrentGitRepoData, resolveDockerfilePath } from "@/plugins";

import { askForProjectAndApp } from "../apps/ask-project-and-app";
import { updateAppGitInfo } from "../apps/update-git-config";
import { stageCommitAndPushAll } from "../git/git-utils";
import { askForRegistry } from "../registry/ask-for-registry";
import { generateBuildTag } from "./generate-build-tag";
import type { StartBuildParams } from "./index";

/**
 * Request the build server to start building & deploying
 */
export async function requestBuild(options: InputOptions) {
	if (process.env.CLI_MODE === "server") {
		logError(`This command is only available at CLIENT MODE.`);
		return;
	}
	const { DB } = await import("@/modules/api/DB");

	if (!options.targetDirectory) options.targetDirectory = process.cwd();

	// ask for project & app information
	let project: IProject, app: IApp;
	if (!options.appSlug) {
		let { project: _project, app: _app } = await askForProjectAndApp(options.targetDirectory, options);
		project = _project;
		app = _app;

		if (options.isDebugging) console.log("askForDeployEnvironmentInfo > app :>> ", app);
		if (options.isDebugging) console.log("askForDeployEnvironmentInfo > project :>> ", project);

		options.appSlug = app.slug;
		options.projectSlug = app.projectSlug;
	}

	// verify if this app's directory has any git remote integrated
	const gitInfo = await getCurrentGitRepoData(options.targetDirectory);
	if (options.isDebugging) console.log("askForDeployEnvironmentInfo > gitInfo :>> ", gitInfo);

	if (!gitInfo) {
		logError(`This app's directory doesn't have any git remote integrated.`);
		return;
	}

	const gitBranch = gitInfo.branch;
	if (!app.git || !app.git.provider || !app.git.repoSSH || !app.git.repoURL) {
		const updateGitInfo: AppGitInfo = { provider: gitInfo.provider, repoSSH: gitInfo.repoSSH, repoURL: gitInfo.repoURL };
		if (options.isDebugging) console.log("askForDeployEnvironmentInfo > updateGitInfo :>> ", updateGitInfo);

		app = await updateAppGitInfo(app, updateGitInfo);
		if (options.isDebugging) console.log("askForDeployEnvironmentInfo > app :>> ", app);
	}

	// container registry
	let registry: IContainerRegistry;
	if (typeof options.registry === "boolean" || typeof options.registry === "undefined") {
		registry = await askForRegistry();
		options.registry = registry.slug;
	} else {
		registry = await DB.findOne("registry", { slug: options.registry });
	}

	if (!registry) {
		logError(`Container Registry "${options.registry}" not found.`);
		return;
	}

	//
	const { buildServerUrl } = getCliConfig();
	const { env, targetDirectory } = options;
	const START_BUILD_API_PATH = `${buildServerUrl}/api/v1/build/start`;

	// check Dockerfile -> no dockerfile, no build -> failed
	let dockerFile = resolveDockerfilePath({ targetDirectory, env });
	if (!dockerFile) return;

	/**
	 * Generate build number & build image as docker image tag
	 */
	const imageURL = `${registry.imageBaseURL}/${app.projectSlug}-${app.slug}`;
	const tagInfo = await generateBuildTag(options.targetDirectory, { branch: options.gitBranch });
	if (options.isDebugging) console.log("tagInfo :>> ", tagInfo);

	options.buildTag = tagInfo.tag;
	options.buildImage = `${imageURL}:${options.buildTag}`;

	if (options.isDebugging) console.log("options.buildTag :>> ", options.buildTag);

	const SOCKET_ROOM = `${app.slug}-${options.buildTag}`;

	/**
	 * Stage, commit & push configuration files (dx.json) to GIT repository:
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
	log(`Requesting Diginext Server to build this app: "${app.projectSlug}/${app.slug}" (branch: "${gitBranch}")`);

	// const deployOptions = JSON.stringify(options);
	const requestBuildData: StartBuildParams = {
		gitBranch: gitBranch,
		buildTag: options.buildTag,
		buildNumber: options.buildTag, // <-- Fallback support CLI <3.21.0 (Will be removed soon)
		registrySlug: registry.slug,
		appSlug: app.slug,
	};

	if (options.isDebugging) {
		console.log("Request build data :>> ");
		console.dir(requestBuildData, { depth: 10 });
	}

	try {
		const requestResult = await fetchApi({
			url: START_BUILD_API_PATH,
			method: "POST",
			data: requestBuildData,
		});

		if (options.isDebugging) {
			console.log("Request build result :>> ");
			console.dir(requestResult, { depth: 10 });
		}

		if (!requestResult.status) logError(requestResult.messages[0] || `Unable to process Request Build API.`);

		log(`-> Check build status here: ${requestResult.data?.logURL} `);
	} catch (e) {
		logError(`Unable to call Build Deploy API:`, e);
		return;
	}

	// update the project so it can be sorted on top
	try {
		await DB.updateOne("project", { slug: app.projectSlug }, { lastUpdatedBy: options.username });
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
			// log("[CLI Server] Disconnected");
			socket.emit("leave", { room: SOCKET_ROOM });
		});

		socket.on("connect", () => {
			// log("[CLI Server] Connected");
			socket.emit("join", { room: SOCKET_ROOM });
		});

		return new Promise((resolve, reject) => {
			socket.on("message", ({ action, message, type }) => {
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
					if (type === "error") {
						// process.exit(1);
						reject(message);
					} else {
						// process.exit(0);
						resolve(true);
					}
				}
			});

			// Max build duration: 30 mins
			setTimeout(() => reject(`Request timeout (30 minutes)`), 30 * 60 * 1000);
		});
	} else {
		return true;
	}
}
