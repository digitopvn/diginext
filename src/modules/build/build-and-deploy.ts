import chalk from "chalk";
import dayjs from "dayjs";
import humanizeDuration from "humanize-duration";

import { Config, IsTest } from "@/app.config";
import { wait } from "@/plugins";
import { MongoDB } from "@/plugins/mongodb";
import { socketIO } from "@/server";
import MediaService from "@/services/MediaService";

import screenshot from "../capture/screenshot";
import type { DeployBuildOptions, DeployBuildResult } from "../deploy/deploy-build";
import { deployBuild } from "../deploy/deploy-build";
import type { StartBuildParams, StartBuildResult } from "./build";
import { startBuild } from "./build";
import { sendLog } from "./send-log-message";

export const buildAndDeploy = async (buildParams: StartBuildParams, deployParams: DeployBuildOptions) => {
	const { DB } = await import("@/modules/api/DB");

	// [1] Build container image
	if (typeof buildParams.buildWatch === "undefined") buildParams.buildWatch = true;
	buildParams.env = deployParams.env;
	buildParams.shouldDeploy = true; // <-- keep this to disable webhook notification when build success

	let buildInfo: StartBuildResult;
	try {
		buildInfo = await startBuild(buildParams);
		if (!buildInfo) throw new Error(`[BUILD_AND_DEPLOY] Unable to build.`);
	} catch (e) {
		const SOCKET_ROOM = `${buildParams.appSlug}-${buildParams.buildTag}`;
		sendLog({ SOCKET_ROOM, type: "error", message: `Build error: ${e.stack}` });
		return;
	}

	const { build, startTime, SOCKET_ROOM } = buildInfo;
	sendLog({ SOCKET_ROOM, message: `[BUILD_AND_DEPLOY] Finished building > buildTag :>> ${build.tag}` });

	if (!build) throw new Error(`Unable to build "${buildParams.appSlug}" app (${buildParams.env}).`);

	const { appSlug, projectSlug } = build;

	// [2] Deploy the build to target deploy environment
	if (!deployParams.env) deployParams.env = buildParams.env || "dev";
	if (typeof deployParams.deployInBackground === "undefined") deployParams.deployInBackground = false;

	let deployRes: DeployBuildResult;
	try {
		deployRes = await deployBuild(build, deployParams);
	} catch (e) {
		sendLog({ SOCKET_ROOM, type: "error", message: `Deploy error: ${e.stack}` });
		return;
	}

	const { env } = deployParams;

	const { release, deployment } = deployRes;
	sendLog({ SOCKET_ROOM, message: `[BUILD_AND_DEPLOY] Finished building > Release ID :>> ${release._id}` });

	const releaseId = MongoDB.toString(release._id);
	const { endpoint, prereleaseUrl } = deployment;

	// [3] Print success information
	const endTime = dayjs();
	const buildDuration = endTime.diff(startTime, "millisecond");
	const humanDuration = humanizeDuration(buildDuration, { round: true });

	sendLog({ SOCKET_ROOM, message: chalk.green(`🎉 FINISHED DEPLOYING AFTER ${humanDuration} 🎉`), type: "success" });

	// [4] Capture a screenshot (scheduled after 30 seconds after the deployment):
	// console.log("IsTestCI() :>> ", IsTestCI());
	// console.log("Config.ENV :>> ", Config.ENV);
	// console.log("process.env.NODE_ENV :>> ", process.env.NODE_ENV);
	if (!IsTest()) {
		try {
			// let's this job run in background
			wait(30 * 1000, () => {
				screenshot(env === "prod" ? prereleaseUrl : endpoint, { fullPage: false }).then(async (result) => {
					if (result) {
						// success -> write to db
						delete result.buffer;
						const mediaSvc = new MediaService();
						const media = await mediaSvc.create({ ...result, owner: deployParams.owner._id, workspace: deployParams.workspace._id });
						if (media) {
							// update screenshot to release
							const updatedRelease = await DB.updateOne("release", { _id: releaseId }, { screenshot: media.url });
							// if (updatedRelease) sendLog({ SOCKET_ROOM, message: `Screenshot: ${media.url}` });

							// update screenshot to app's deploy environment
							const app = await DB.updateOne("app", { slug: appSlug }, { [`deployEnvironment.${env}.screenshot`]: media.url });
							// if (!app) sendLog({ SOCKET_ROOM, message: `Unable to update screenshot to app's deploy environment (${env})` });
						}
					}
				});
			});
		} catch (e) {
			sendLog({
				SOCKET_ROOM,
				message: `[BUILD_AND_DEPLOY] Unable to capture the webpage screenshot (${env === "prod" ? prereleaseUrl : endpoint}): ${e}`,
			});
		}
	}

	if (env == "prod") {
		const buildServerUrl = Config.BASE_URL;
		const rollOutUrl = `${buildServerUrl}/project/?lv1=release&project=${projectSlug}&app=${appSlug}&env=prod`;

		sendLog({ SOCKET_ROOM, message: chalk.bold(chalk.yellow(`✓ Preview at: ${prereleaseUrl}`)), type: "success" });

		sendLog({
			SOCKET_ROOM,
			message: chalk.bold(chalk.yellow(`✓ Review & publish at: ${rollOutUrl}`)),
			type: "success",
		});

		sendLog({
			SOCKET_ROOM,
			message: chalk.bold(chalk.yellow(`✓ Roll out with CLI command:`), `$ dx rollout ${releaseId}`),
			type: "success",
		});
	} else {
		sendLog({ SOCKET_ROOM, message: chalk.bold(chalk.yellow(`✓ Check out your release at: ${endpoint}`)), type: "success" });
	}

	// disconnect CLI client:
	socketIO?.to(SOCKET_ROOM).emit("message", { action: "end" });

	return { build, release };
};
