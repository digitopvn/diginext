import chalk from "chalk";
import dayjs from "dayjs";
import humanizeDuration from "humanize-duration";

import { IsTest } from "@/app.config";
import type { IWorkspace } from "@/entities";
import { Logger, wait } from "@/plugins";
import { uploadFileBuffer } from "@/plugins/cloud-storage";
import { MongoDB } from "@/plugins/mongodb";
import { socketIO } from "@/server";
import MediaService from "@/services/MediaService";

import screenshot from "../capture/screenshot";
import { createBuildSlug } from "../deploy/create-build-slug";
import type { DeployBuildV2Options, DeployBuildV2Result } from "../deploy/deploy-build-v2";
import { deployBuildV2 } from "../deploy/deploy-build-v2";
import type { StartBuildParams, StartBuildResult } from "./build";
import { startBuild, stopBuild } from "./build";
import { sendLog } from "./send-log-message";

export const buildAndDeploy = async (buildParams: StartBuildParams, deployParams: DeployBuildV2Options) => {
	// import services
	const { AppService } = await import("@/services");
	const { ReleaseService } = await import("@/services");
	const appSvc = new AppService();
	const releaseSvc = new ReleaseService();

	// [1] Build container image
	if (typeof buildParams.buildWatch === "undefined") buildParams.buildWatch = true;
	buildParams.env = deployParams.env;
	buildParams.shouldDeploy = true; // <-- keep this to disable webhook notification when build success

	let buildInfo: StartBuildResult;
	try {
		buildInfo = await startBuild(buildParams);
		if (!buildInfo) throw new Error(`[BUILD_AND_DEPLOY] Unable to build.`);
	} catch (e) {
		// build failed -> stop build
		const app = await appSvc.findOne({ slug: buildParams.appSlug }, { populate: ["workspace"] });
		const SOCKET_ROOM = createBuildSlug({ projectSlug: app.projectSlug, appSlug: buildParams.appSlug, buildTag: buildParams.buildTag });
		stopBuild(app.projectSlug, app.slug, SOCKET_ROOM, "failed");
		sendLog({ SOCKET_ROOM, type: "error", message: `Build error: ${e.stack}` });

		// AI analysis: get latest 100 lines of container logs
		const fullLogs = Logger.getLogs(SOCKET_ROOM);
		const latestLogs = fullLogs ? fullLogs.split("\n").slice(-100).join("\n") : undefined;
		const workspace = app.workspace as IWorkspace;
		const owner = buildParams.user;
		console.log("buildAndDeploy() > latestLogs :>> ", latestLogs);
		console.log("buildAndDeploy() > workspace :>> ", workspace);
		console.log("buildAndDeploy() > owner :>> ", owner);
		let aiAnalysis = "\n---- AI ANALYSIS ----\n";
		if (workspace.settings?.ai?.enabled && latestLogs) {
			const { AIService } = await import("@/services/AIService");
			const aiService = new AIService({ owner, workspace });
			try {
				const analysis = await aiService.analyzeErrorLog(latestLogs, { isDebugging: buildParams.isDebugging });
				aiAnalysis += analysis;
			} catch (error) {
				console.error(error);
				aiAnalysis += `AI service is currently unavailable: ${error.message}`;
			}
			sendLog({ SOCKET_ROOM, type: "log", message: aiAnalysis });
		} else {
			sendLog({ SOCKET_ROOM, type: "log", message: "AI analysis is disabled. If you need it, please enable it in your workspace settings." });
		}

		return;
	}

	const { build, startTime, SOCKET_ROOM } = buildInfo;
	sendLog({ SOCKET_ROOM, message: `[BUILD_AND_DEPLOY] Finished building > buildTag :>> ${build.tag}` });
	sendLog({ SOCKET_ROOM, message: `[BUILD_AND_DEPLOY] Finished building > buildNumber :>> ${build.num}` });

	if (!build) throw new Error(`Unable to build "${buildParams.appSlug}" app (${buildParams.env}).`);

	const { appSlug, projectSlug } = build;

	// [2] Deploy the build to target deploy environment
	if (!deployParams.env) deployParams.env = buildParams.env || "dev";
	if (typeof deployParams.deployInBackground === "undefined") deployParams.deployInBackground = false;

	let deployRes: DeployBuildV2Result;
	try {
		deployRes = await deployBuildV2(build, deployParams);
	} catch (e) {
		stopBuild(projectSlug, appSlug, SOCKET_ROOM, "success", "failed");
		sendLog({ SOCKET_ROOM, type: "error", message: `Deploy error: ${e.stack}` });
		return;
	}

	const { env } = deployParams;

	const { release, deployment } = deployRes;
	sendLog({ SOCKET_ROOM, message: `[BUILD_AND_DEPLOY] Finished building > Release ID :>> ${release._id}` });

	const releaseId = MongoDB.toString(release._id);
	const { endpoint } = deployment;

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
			// let's this job run in background after 2 minutes
			wait(2 * 60 * 1000, async () => {
				const result = await screenshot(endpoint, { fullPage: false });
				if (result) {
					// upload to cloud storage (if any)
					const { workspace } = deployParams;
					let cloudUploadedUrl: string | undefined;
					if (workspace && workspace.settings.cloud_storage) {
						const uploaded = await uploadFileBuffer(result.buffer, result.name, {
							storage: workspace.settings.cloud_storage,
						}).catch((e) => {
							console.error(`[BUILD_AND_DEPLOY] Unable to upload screenshot to cloud storage (${endpoint}): ${e}`);
							return null;
						});
						if (uploaded) cloudUploadedUrl = uploaded.publicUrl;
					}
					// success -> write to db
					delete result.buffer;
					const mediaSvc = new MediaService({ owner: deployParams.owner, workspace: deployParams.workspace });
					const media = await mediaSvc.create({
						...result,
						screenshotUrl: cloudUploadedUrl || result.url,
						owner: deployParams.owner._id,
						workspace: deployParams.workspace._id,
					});
					if (media) {
						// update screenshot to release
						releaseSvc.updateOne({ _id: releaseId }, { screenshot: media.url });
						// update screenshot to app's deploy environment
						appSvc.updateOne({ slug: appSlug }, { [`deployEnvironment.${env}.screenshot`]: media.url });
					}
				}
			});
		} catch (e) {
			sendLog({
				SOCKET_ROOM,
				message: `[BUILD_AND_DEPLOY] Unable to capture the webpage screenshot (${endpoint}): ${e}`,
			});
		}
	}

	// [5] Send success message to the CLI client:
	sendLog({ SOCKET_ROOM, message: chalk.bold(chalk.yellow(`✓ Check out your release at: ${endpoint}`)), type: "success" });

	// wait for 3 seconds before disconnecting the CLI client
	await wait(3000);

	// disconnect CLI client:
	socketIO?.to(SOCKET_ROOM).emit("message", { action: "end" });

	return { build, release };
};
