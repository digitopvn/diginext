import chalk from "chalk";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import inquirer from "inquirer";
import { isEmpty } from "lodash";
import simpleGit from "simple-git";
import { io } from "socket.io-client";

import { getCliConfig } from "@/config/config";
import { CLI_DIR } from "@/config/const";
import type { App, Project } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";
import { stageAllFiles } from "@/modules/bitbucket";
import { getAppConfig, getCurrentGitRepoData, resolveDockerfilePath, resolveEnvFilePath, saveAppConfig } from "@/plugins";

import { DB } from "../api/DB";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { askForDeployEnvironmentInfo } from "./ask-deploy-environment-info";
import { checkGitignoreContainsDotenvFiles } from "./dotenv-exec";
import { uploadDotenvFileByApp } from "./dotenv-upload";

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
	const { env, projectSlug, slug, targetDirectory } = options;

	const appDirectory = targetDirectory;
	const DEPLOY_API_PATH = `${buildServerUrl}/api/v1/deploy`;
	const BUILD_SERVER_URL = buildServerUrl;

	if (options.isDebugging) {
		log("CLI_MODE =", process.env.CLI_MODE || "client");
		log("CLI_DIR", CLI_DIR);
		log(`CURRENT_WORKING_DIR = ${process.cwd()}`);
		log(`BUILD_SERVER_URL=${BUILD_SERVER_URL}`);
		log(`DEPLOY_API_PATH=${DEPLOY_API_PATH}`);
	}

	// check Dockerfile -> no dockerfile, no build -> failed
	let dockerFile = resolveDockerfilePath({ targetDirectory: appDirectory, env });
	if (!dockerFile) return;

	/**
	 * check if there is deployment configuration
	 * get app config from "dx.json"
	 */
	let appConfig = getAppConfig(targetDirectory);
	console.log("appConfig :>> ", appConfig);
	if (appConfig && appConfig.project) options.projectSlug = appConfig.project;
	if (appConfig && appConfig.slug) options.slug = appConfig.slug;

	/**
	 * validate deploy environment data
	 * if it's invalid, ask for the missing ones
	 */
	const deploymentInfo = await askForDeployEnvironmentInfo(options);
	const { app, appConfig: validatedAppConfig } = deploymentInfo;

	// save deploy environment data to database:
	const updatedApp = await DB.update<App>("app", { slug: app.slug }, { deployEnvironment: { [env]: deploymentInfo.deployEnvironment } });
	console.log("updatedApp :>> ", updatedApp);

	// save deploy environment data into local app config (dx.json)
	appConfig = saveAppConfig(validatedAppConfig, { directory: targetDirectory });

	/**
	 * Generate build number & build image as docker image tag
	 */
	const { imageURL } = appConfig.environment[env];
	options.buildNumber = makeDaySlug({ divider: "" });
	options.buildImage = `${imageURL}:${options.buildNumber}`;

	const SOCKET_ROOM = `${options.slug}-${options.buildNumber}`;
	options.SOCKET_ROOM = SOCKET_ROOM;

	// check database to see should sync ENV variables or not...
	let deployEnvironmentFromDB = await getDeployEvironmentByApp(app, env);

	// merge with appConfig
	const deployEnvironment = { ...appConfig.environment[env], ...deployEnvironmentFromDB };
	const serverEnvironmentVariables = deployEnvironment?.envVars || [];

	let envFile = resolveEnvFilePath({ targetDirectory: appDirectory, env, ignoreIfNotExisted: true });

	// if "--upload-env" flag is specified:
	if (options.shouldUploadDotenv) {
		if (!envFile) {
			logWarn(`Can't upload DOTENV since there are no DOTENV files (.env.*) in this directory`);
		} else {
			await uploadDotenvFileByApp(envFile, app, env);
		}
	} else {
		// if ENV file is existed on local & not available on server -> ask to upload local ENV to server:
		if (envFile && !isEmpty(serverEnvironmentVariables)) {
			logWarn(`Skip uploading local ENV variables to deployed environment since it's already existed.`);
			log(`(If you want to force upload local ENV variables, deploy again with: ${chalk.cyan("dx deploy --upload-env")})`);
		}

		if (envFile && isEmpty(serverEnvironmentVariables)) {
			const { shouldUploadEnv } = await inquirer.prompt({
				type: "confirm",
				name: "shouldUploadEnv",
				default: false,
				message: `Do you want to use your "${envFile}" on ${env.toUpperCase()} environment?`,
			});

			if (shouldUploadEnv) await uploadDotenvFileByApp(envFile, app, env);
		}
	}

	// [SECURITY CHECK] warns if DOTENV files are not listed in ".gitignore" file
	await checkGitignoreContainsDotenvFiles({ targetDir: appDirectory });

	// Notify the commander:
	log(`Requesting BUILD SERVER to deploy this app: "${projectSlug}/${slug}"`);

	// additional params:
	options.namespace = appConfig.environment[env].namespace;

	// get remote SSH
	const { remoteSSH, remoteURL, provider: gitProvider } = await getCurrentGitRepoData(options.targetDirectory);
	options.remoteSSH = remoteSSH;
	options.remoteURL = remoteURL;
	options.gitProvider = gitProvider;

	// get git branch:
	const git = simpleGit(appDirectory, { binary: "git" });
	const gitStatus = await git.status(["-s"]);
	options.gitBranch = gitStatus.current;

	// Commit the deployment files to GIT repository:
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

	// return;
	// Make an API to request server to build:
	const deployOptions = JSON.stringify(options);
	try {
		const { status, messages = ["Unknown error."] } = await fetchApi({
			url: DEPLOY_API_PATH,
			method: "POST",
			data: { options: deployOptions },
		});

		if (!status) {
			logError(`Can't deploy due to:`, messages[0]);
			return;
		}
	} catch (e) {
		logError(`Unexpected network error:`, e);
		return;
	}

	// update the project so it can be sorted on top
	try {
		await DB.update<Project>("project", { slug: projectSlug }, { lastUpdatedBy: options.username });
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
