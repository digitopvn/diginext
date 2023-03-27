import chalk from "chalk";
import dayjs from "dayjs";
import { log, logError, logSuccess } from "diginext-utils/dist/console/log";
import { existsSync, rmSync } from "fs";
import humanizeDuration from "humanize-duration";
import { isEmpty } from "lodash";
import { ObjectId } from "mongodb";
import PQueue from "p-queue";
import path from "path";

import { isServerMode } from "@/app.config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { App, Build, ContainerRegistry, Project, User, Workspace } from "@/entities";
import { execCmd, getGitProviderFromRepoSSH, Logger, resolveDockerfilePath } from "@/plugins";
import { getIO, socketIO } from "@/server";

import { DB } from "../api/DB";
import builder from "../builder";
import { verifySSH } from "../git";
import { sendLog } from "./send-log-message";
import { updateBuildStatus, updateBuildStatusByAppSlug } from "./update-build-status";

export let queue = new PQueue({ concurrency: 1 });

export type StartBuildParams = {
	/**
	 * App's slug
	 */
	appSlug: string;
	/**
	 * Build number is also an container image's tag
	 */
	buildNumber: string;
	/**
	 * Select a git branch to pull source code & build
	 */
	gitBranch: string;

	/**
	 * ID of the author
	 * - `If passing "userId", no need to pass "user" and vice versa.`
	 */
	userId?: string;

	/**
	 * {User} instance of the author
	 * - `If passing "user", no need to pass "userId" and vice versa.`
	 */
	user?: User;

	/**
	 * Slug of the Container Registry
	 */
	registrySlug: string;

	/**
	 * Select the deploy environment to build image, in this case, this info is using for selecting "Dockerfile"
	 * of specific deploy environment only, for example: "Dockerfile.dev" or "Dockerfile.prod",
	 * if you don't specify "env", a default "Dockerfile" will be selected.
	 * - **[OPTIONAL] SHOULD NOT rely on this!**
	 * - A build should be able to used for any deploy environments.
	 */
	env?: string;

	/**
	 * Path to the source code directory
	 * * [OPTIONAL] Only apply for CLI command, has no effects on API call
	 */
	buildDir?: string;

	/**
	 * Diginext CLI version of client user
	 */
	cliVersion?: string;

	/**
	 * @default false
	 */
	isDebugging?: boolean;
};

export async function testBuild() {
	// let spawn = require("child_process").spawn;
	// let temp = spawn("docker", ["build", "-t", "digitop/test_image", "-f", "Dockerfile", "."]);
	// temp.stdio.forEach((io) => io.on("data", (data) => log(data.toString())));
	let socketServer = getIO();
	log("socketServer:", socketServer);
}

/**
 * Save build log content to database
 */
export async function saveLogs(buildSlug: string, logs: string) {
	if (!buildSlug) throw new Error(`Build's slug is required, it's empty now.`);
	const [build] = await DB.update<Build>("build", { slug: buildSlug }, { logs });
	return build;
}

/**
 * Stop the build process.
 */
export const stopBuild = async (projectSlug: string, appSlug: string, buildSlug: string) => {
	let error;

	// Validate...
	if (!appSlug) {
		error = `App "${appSlug}" not found.`;
		logError(error);
		return { error };
	}

	// Stop the f*cking buildx driver...
	const builderName = `${projectSlug.toLowerCase()}_${appSlug.toLowerCase()}`;
	await builder.Docker.stopBuild(builderName);

	// Update the status in the database
	const stoppedBuild = await updateBuildStatusByAppSlug(appSlug, buildSlug, "failed");

	logSuccess(`Build process of "${buildSlug}" has been stopped.`);

	return stoppedBuild;
};

export async function startBuild(params: StartBuildParams) {
	// parse variables
	const startTime = dayjs();

	const {
		buildNumber,
		gitBranch,
		registrySlug,
		userId,
		user,
		appSlug,
		// optional
		env,
		isDebugging = false,
		cliVersion,
	} = params;

	const author = user || (await DB.findOne<User>("user", { _id: new ObjectId(userId) }, { populate: ["workspaces", "activeWorkspaces"] }));
	console.log("author :>> ", author);

	const app = await DB.findOne<App>("app", { slug: appSlug }, { populate: ["owner", "workspace", "project"] });
	// get workspace
	const { activeWorkspace, slug: username } = author;
	const workspace = activeWorkspace as Workspace;

	// socket & logs
	const SOCKET_ROOM = `${appSlug}-${buildNumber}`;
	const logger = new Logger(SOCKET_ROOM);

	// Emit socket message to request the BUILD SERVER to start building...
	socketIO?.to(SOCKET_ROOM).emit("message", { action: "start" });

	// Validating...
	if (isEmpty(app)) {
		sendLog({ SOCKET_ROOM, type: "error", message: `[START BUILD] App "${appSlug}" not found.` });
		return;
	}

	// the container registry to store this build image
	const registry = await DB.findOne<ContainerRegistry>("registry", { slug: registrySlug });

	if (isEmpty(registry)) {
		sendLog({ SOCKET_ROOM, type: "error", message: `[START BUILD] Container registry "${registrySlug}" not found.` });
		return;
	}

	if (isEmpty(app.project)) {
		sendLog({ SOCKET_ROOM, type: "error", message: `[START BUILD] App "${appSlug}" doesn't belong to any projects (probably deleted?).` });
		return;
	}

	if (isEmpty(app.git) || isEmpty(app.git?.repoSSH)) {
		sendLog({ SOCKET_ROOM, type: "error", message: `[START BUILD] App "${appSlug}" doesn't have any git repository data (probably deleted?).` });
		return;
	}

	// project info
	const project = app.project as Project;
	const { slug: projectSlug } = project;

	// build image
	const { image: imageURL = `${registry.imageBaseURL}/${projectSlug}/${app.slug}` } = app;

	// get latest build of this app to utilize the cache for this build process
	const latestBuild = await DB.findOne<Build>("build", { appSlug, projectSlug, status: "success" }, { order: { createdAt: "DESC" } });

	// get app's repository data:
	const {
		git: { repoSSH },
	} = app;

	// Build image
	const buildImage = `${imageURL}:${buildNumber}`;

	log("[START BUILD] Input params :>>", params);

	/**
	 * ===============================================
	 * Specify BUILD DIRECTORY to pull source code to:
	 * ===============================================
	 */
	const SOURCE_CODE_DIR = `cache/${projectSlug}/${appSlug}/${gitBranch}`;
	let buildDir = isServerMode ? path.resolve(CLI_CONFIG_DIR, SOURCE_CODE_DIR) : params.buildDir;

	// detect "gitProvider" from git repo SSH URI:
	const gitProvider = getGitProviderFromRepoSSH(repoSSH);

	// create new build on build server:
	const buildData = {
		slug: SOCKET_ROOM,
		name: buildImage,
		image: imageURL,
		tag: buildNumber,
		status: "building",
		startTime: startTime.toDate(),
		createdBy: username,
		projectSlug,
		appSlug,
		logs: logger?.content,
		cliVersion,
		registry: registry._id,
		app: app._id,
		project: project._id,
		owner: author._id,
		workspace: workspace._id,
	} as Build;

	const newBuild = await DB.create<Build>("build", buildData);
	if (!newBuild) {
		console.log("buildData :>> ", buildData);
		sendLog({ SOCKET_ROOM, message: "[START BUILD] Failed to create new build on server." });
		return;
	}
	sendLog({ SOCKET_ROOM, message: "[START BUILD] Created new build on server!" });

	// verify SSH before pulling files...
	const gitAuth = await verifySSH({ gitProvider });
	if (!gitAuth) {
		sendLog({ SOCKET_ROOM, type: "error", message: `[START BUILD] "${buildDir}" -> Failed to verify "${gitProvider}" git SSH key.` });
		await updateBuildStatus(newBuild, "failed");
		return;
	}

	// Git SSH verified -> start pulling now...
	sendLog({ SOCKET_ROOM, message: `[START BUILD] Pulling latest source code from "${repoSSH}" at "${gitBranch}" branch...` });

	if (existsSync(buildDir)) {
		try {
			sendLog({ SOCKET_ROOM, message: `[START BUILD] Trying to check out existing directory and do git pull at: ${buildDir}` });
			await execCmd(`cd '${buildDir}' && git checkout -f && git pull --rebase`);
		} catch (e) {
			sendLog({ SOCKET_ROOM, message: `[START BUILD] Removing a directory: ${buildDir} :>> ${e}` });
			rmSync(buildDir, { recursive: true, force: true });

			sendLog({ SOCKET_ROOM, message: `[START BUILD] Clone new source code into directory: ${buildDir}` });
			try {
				await execCmd(`git clone ${repoSSH} --branch ${gitBranch} --single-branch ${buildDir}`);
			} catch (e2) {
				sendLog({
					SOCKET_ROOM,
					type: "error",
					message: `[START BUILD] Failed to clone new branch "${gitBranch}" to "${buildDir}": ${e2}`,
				});
				await updateBuildStatus(newBuild, "failed");
				return;
			}
		}
	} else {
		try {
			sendLog({ SOCKET_ROOM, message: `[START BUILD] Clone new source code into: ${buildDir}` });
			await execCmd(`git clone ${repoSSH} --branch ${gitBranch} --single-branch ${buildDir}`);
		} catch (e) {
			sendLog({
				SOCKET_ROOM,
				type: "error",
				message: `[START BUILD] Failed to Clone new branch "${gitBranch}" to "${buildDir}": ${e}`,
			});
			// await updateBuildStatus(newBuild, "failed");
			// return;
		}
	}

	// emit socket message to "digirelease" app:
	sendLog({ SOCKET_ROOM, message: `[START BUILD] Finished pulling latest files of "${gitBranch}"...` });

	/**
	 * Check if Dockerfile existed
	 */
	let dockerFile = resolveDockerfilePath({ targetDirectory: buildDir, env });
	if (isDebugging) console.log("dockerFile :>> ", dockerFile);

	if (!dockerFile) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `[START BUILD] Missing "Dockerfile" to build the application, please create your "Dockerfile" in the root directory of the source code.`,
		});
		return;
	}

	// Update app so it can be sorted on top!
	const updatedAppData = { lastUpdatedBy: username } as App;
	const [updatedApp] = await DB.update<App>("app", { slug: appSlug, image: imageURL }, updatedAppData);

	sendLog({ SOCKET_ROOM, message: `[START BUILD] Generated the deployment files successfully!` });

	/**
	 * ====================================================
	 * Build the app with BUILDER ENGINE (Docker or Podman):
	 * ====================================================
	 */

	sendLog({ SOCKET_ROOM, message: `[START BUILD] Start building the Docker image...` });

	const notifyClients = () => {
		const endTime = dayjs();
		const buildDuration = endTime.diff(startTime, "millisecond");
		const humanDuration = humanizeDuration(buildDuration);

		sendLog({
			SOCKET_ROOM,
			message: chalk.green(`✓ FINISHED BUILDING IMAGE AFTER ${humanDuration}`),
			type: "success",
		});
	};

	const buildEngineName = process.env.BUILDER || "podman";
	const buildEngine = buildEngineName === "docker" ? builder.Docker : builder.Podman;
	buildEngine
		.build(buildImage, {
			platforms: ["linux/amd64"],
			builder: `${projectSlug.toLowerCase()}_${appSlug.toLowerCase()}`,
			cacheFroms: latestBuild ? [{ type: "registry", value: latestBuild.image }] : [],
			dockerFile: dockerFile,
			buildDirectory: buildDir,
			shouldPush: true,
			onBuilding: (message) => sendLog({ SOCKET_ROOM, message }),
		})
		.then(async () => {
			// update build status as "success"
			await updateBuildStatus(newBuild, "success");

			sendLog({
				SOCKET_ROOM,
				message: `✓ Pushed to container registry (${registrySlug}) successfully!`,
			});

			notifyClients();
		})
		.catch(async (e) => {
			await updateBuildStatus(newBuild, "failed");
			sendLog({ SOCKET_ROOM, message: e.message, type: "error" });

			notifyClients();
		});

	return { SOCKET_ROOM, build: newBuild, imageURL, buildImage, startTime, builder: buildEngineName };
}
