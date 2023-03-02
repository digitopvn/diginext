import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import { io } from "socket.io-client";

import { getCliConfig } from "@/config/config";
import { CLI_DIR } from "@/config/const";
import type { Project } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";

import { DB } from "../api/DB";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { askForDeployEnvironmentInfo } from "./ask-deploy-environment-info";

/**
 * Request the build server to start deploying with URL of container image
 */
export async function requestDeployImage(imageURL: string, options: InputOptions) {
	if (process.env.CLI_MODE === "server") {
		logError(`This command is only available at CLIENT MODE.`);
		return;
	}

	const { buildServerUrl } = getCliConfig();
	const { env, projectSlug, slug } = options;

	const DEPLOY_IMAGE_API_PATH = `${buildServerUrl}/api/v1/deploy/from-image`;
	const BUILD_SERVER_URL = buildServerUrl;

	if (options.isDebugging) {
		log("CLI_MODE =", process.env.CLI_MODE || "client");
		log("CLI_DIR", CLI_DIR);
		log(`CURRENT_WORKING_DIR = ${process.cwd()}`);
		log(`BUILD_SERVER_URL=${BUILD_SERVER_URL}`);
		log(`DEPLOY_IMAGE_API_PATH=${DEPLOY_IMAGE_API_PATH}`);
	}

	/**
	 * validate deploy environment data
	 * if it's invalid, ask for the missing ones
	 */
	const { app, appConfig } = await askForDeployEnvironmentInfo(options);

	/**
	 * Generate build number & build image as docker image tag
	 * Deploy image URL -> no need build -> no build number
	 * Build image = imageURL
	 */
	// options.buildNumber = makeDaySlug({ divider: "" });
	// options.buildImage = `${imageURL}:${options.buildNumber}`;
	options.buildImage = imageURL;

	const SOCKET_ROOM = `${options.slug}-${options.buildNumber}`;
	options.SOCKET_ROOM = SOCKET_ROOM;

	// check database to see should sync ENV variables or not...
	let deployEnvironmentFromDB = await getDeployEvironmentByApp(app, env);

	// merge with appConfig
	const deployEnvironment = { ...appConfig.environment[env], ...deployEnvironmentFromDB };
	const serverEnvironmentVariables = deployEnvironment?.envVars || [];

	// TODO: parse ENV variables from CLI "options" ?

	// Notify the commander:
	log(`Requesting BUILD SERVER to deploy this image: "${projectSlug}/${slug}"`);

	// additional params:
	options.namespace = appConfig.environment[env].namespace;

	// return;
	// Make an API to request server to build:
	const deployOptions = JSON.stringify(options);
	try {
		const { status, messages = ["Unknown error."] } = await fetchApi({
			url: DEPLOY_IMAGE_API_PATH,
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

	// TODO: Link to check for deployment process
	// log(`-> Check deployment process here: ${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM} `);

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
