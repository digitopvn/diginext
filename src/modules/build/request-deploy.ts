import chalk from "chalk";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import simpleGit from "simple-git";
import { io } from "socket.io-client";

import { getCliConfig } from "@/config/config";
import { CLI_DIR } from "@/config/const";
import type { App } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";
import { stageAllFiles } from "@/modules/bitbucket";
import { generateDeployment } from "@/modules/deploy/generate-deployment";
import { getAppConfig, getCurrentRepoURIs, getPackageConfig, savePackageConfig } from "@/plugins";

/**
 * Request the build server to start building & deploying
 */

export async function requestDeploy(options: InputOptions) {
	if (process.env.CLI_MODE === "server") {
		logError(`This command is only available at CLIENT MODE.`);
		return false;
	}

	const { buildServerUrl } = getCliConfig();
	const { env, projectSlug, slug } = options;

	if (!options.targetDirectory) options.targetDirectory = process.cwd();

	const appDirectory = options.targetDirectory;
	const DEPLOY_API_PATH = `${buildServerUrl}/api/deploy`;
	const BUILD_SERVER_URL = buildServerUrl;

	if (options.isDebugging) {
		log("CLI_MODE =", process.env.CLI_MODE || "client");
		log("CLI_DIR", CLI_DIR);
		log(`CURRENT_WORKING_DIR = ${process.cwd()}`);
		log(`BUILD_SERVER_URL=${BUILD_SERVER_URL}`);
		log(`DEPLOY_API_PATH=${DEPLOY_API_PATH}`);
	}

	// Increase build version in "package.json"
	const pkg = getPackageConfig({ directory: appDirectory, ignoreIfNotExisted: true });
	if (pkg) {
		const pkgVersionNums = pkg.version.split(".");
		const pkgBuild = pkgVersionNums.length < 3 ? 1 : parseInt(pkgVersionNums[2]) + 1;
		const pkgNewVersion = pkgVersionNums.length < 3 ? `${pkg.version}.${pkgBuild}` : `${pkgVersionNums[0]}.${pkgVersionNums[1]}.${pkgBuild}`;
		pkg.version = pkgNewVersion;
		savePackageConfig(pkg, { directory: appDirectory, ignoreIfNotExisted: true });
	}

	// generate deployment file:
	const { BUILD_NUMBER, IMAGE_NAME, nsName, deploymentContent, prereleaseDeploymentContent } = await generateDeployment(options);
	options.namespace = nsName;
	options.buildImage = IMAGE_NAME;
	options.buildNumber = BUILD_NUMBER;

	// ! IMPORTANT: Save the YAML deployment to "app.environment[env]" !
	// So it can be used to create release from build
	const appConfig = getAppConfig(appDirectory);
	appConfig.environment[env].deploymentYaml = deploymentContent;
	appConfig.environment[env].prereleaseDeploymentYaml = prereleaseDeploymentContent;

	// prepare this app's environment data for database update
	const updatedApp: any = {};
	updatedApp[`environment.${env}`] = JSON.stringify(appConfig.environment[env]);
	updatedApp.lastUpdatedBy = options.username;
	// console.log("updatedApp :>> ", updatedApp);

	// Update user, project, environment to database before deploying
	const { status, data: app } = await fetchApi<App>({
		url: `/api/v1/app?slug=${appConfig.slug}`,
		method: "PATCH",
		data: updatedApp,
	});

	log(`Requesting BUILD SERVER to deploy this app: "${projectSlug}/${slug}"`);

	const SOCKET_ROOM = `${options.slug}-${BUILD_NUMBER}`;

	// additional params:
	options.namespace = nsName;
	options.buildImage = IMAGE_NAME;
	options.buildNumber = BUILD_NUMBER;

	// get remote SSH
	const { remoteSSH, remoteURL, provider: gitProvider } = await getCurrentRepoURIs(options.targetDirectory);
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
		logError(`Can't request for building this app: ${e}`);
		return;
	}

	// return;
	// call api to build:
	const deployOptions = JSON.stringify(options);
	try {
		await fetchApi({
			url: DEPLOY_API_PATH,
			method: "POST",
			data: { options: deployOptions },
		});
	} catch (e) {
		logError(`Can't connect to the deploy API:`, e);
		return;
	}

	log(`-> Check build status here: ${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM} `);
	if (env == "prod") log(chalk.red(`⚠️⚠️⚠️ REMEMBER TO CREATE PULL REQUEST TO "master" (or "main") BRANCH ⚠️⚠️⚠️`));

	if (options.isTail) {
		let socketURL = buildServerUrl.replace(/https/gi, "wss");
		socketURL = buildServerUrl.replace(/http/gi, "ws");
		const socket = io(socketURL, { transports: ["websocket"] });

		socket.on("error", (e) => log(e));
		socket.on("connect_error", (e) => log(e));

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
