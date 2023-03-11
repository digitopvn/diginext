import chalk from "chalk";
import dayjs from "dayjs";
import { log, logError, logSuccess } from "diginext-utils/dist/console/log";
import fs, { existsSync } from "fs";
import humanizeDuration from "humanize-duration";
import { isEmpty } from "lodash";
import { ObjectId } from "mongodb";
import PQueue from "p-queue";
import path from "path";

import { getCliConfig } from "@/config/config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { App, Build, Project, Release, User, Workspace } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchDeploymentFromContent } from "@/modules/deploy/fetch-deployment";
import { execCmd, getGitProviderFromRepoSSH, Logger, resolveDockerfilePath } from "@/plugins";
import { getIO } from "@/server";

import { DB } from "../api/DB";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import builder from "../builder";
import type { GenerateDeploymentResult } from "../deploy";
import { generateDeployment } from "../deploy";
import { verifySSH } from "../git";
import ClusterManager from "../k8s";
import { createReleaseFromBuild, sendLog, updateBuildStatus } from "./index";

export let queue = new PQueue({ concurrency: 1 });

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
	const stoppedBuild = await updateBuildStatus(appSlug, buildSlug, "failed");

	logSuccess(`Build process of "${buildSlug}" has been stopped.`);

	return stoppedBuild;
};

/**
 * Start build the app with {InputOptions}
 */
export async function startBuild(
	options: InputOptions,
	addition: {
		/**
		 * @default true
		 */
		shouldRollout?: boolean;
	} = { shouldRollout: true }
) {
	// parse variables
	const { shouldRollout = true } = addition;
	const startTime = dayjs();

	const { env = "dev", buildNumber, buildImage, gitBranch, username = "Anonymous", projectSlug, slug: appSlug, workspaceId } = options;

	const latestBuild = await DB.findOne<Build>("build", { appSlug, projectSlug, status: "success" }, { order: { createdAt: "DESC" } });
	const app = await DB.findOne<App>("app", { slug: appSlug }, { populate: ["owner", "workspace", "project"] });
	const project = await DB.findOne<Project>("project", { slug: projectSlug });
	const author = await DB.findOne<User>("user", { id: new ObjectId(options.userId) });

	// get workspace
	let workspace = options.workspace;
	if (!workspace) workspace = await DB.findOne<Workspace>("workspace", { _id: app?.workspace });
	if (!workspace) workspace = await DB.findOne<Workspace>("workspace", { _id: project?.workspace });
	if (!workspace && workspaceId) workspace = await DB.findOne<Workspace>("workspace", { _id: workspaceId });
	if (!workspace && username != "Anonymous") workspace = await DB.findOne<Workspace>("workspace", { _id: author.activeWorkspace });

	const BUILD_NUMBER = buildNumber;
	const IMAGE_NAME = buildImage;
	const SOCKET_ROOM = `${appSlug}-${BUILD_NUMBER}`;

	const logger = new Logger(SOCKET_ROOM);
	options.SOCKET_ROOM = SOCKET_ROOM;

	// Emit socket message to request the BUILD SERVER to start building...
	let socketServer = getIO();
	if (socketServer) socketServer.to(SOCKET_ROOM).emit("message", { action: "start" });

	// Validating...
	if (isEmpty(app)) {
		sendLog({ SOCKET_ROOM, logger, type: "error", message: `[START BUILD] App "${appSlug}" not found.` });
		return;
	}

	/**
	 * Specify BUILD DIRECTORY to pull source code:
	 * on build server, this is gonna be --> /mnt/build/{TARGET_DIRECTORY}/{REPO_BRANCH_NAME}
	 * /mnt/build/ -> additional disk (300GB) which mounted to this server on Digital Ocean.
	 */
	let buildDir = options.targetDirectory || process.cwd();

	log("options :>>", options);

	// ! If this function is executed on local machine, then we don't need to do "git pull"

	const SOURCE_CODE = `${options.projectSlug}/${options.slug}/${gitBranch}`;
	buildDir = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE);
	options.targetDirectory = buildDir;
	options.buildDir = buildDir;

	// detect "gitProvider":
	const gitProvider = getGitProviderFromRepoSSH(options.remoteSSH);

	// verify SSH before pulling files...
	try {
		await verifySSH({ gitProvider });
	} catch (e) {
		sendLog({ SOCKET_ROOM, logger, type: "error", message: `"${buildDir}" -> Failed to verify "${gitProvider}" git SSH key.` });
		await updateBuildStatus(appSlug, SOCKET_ROOM, "failed");
		return;
	}

	// Git SSH verified -> start pulling now...
	sendLog({ SOCKET_ROOM, logger, message: `[START BUILD] Pulling latest files from "${options.remoteSSH}" at "${gitBranch}" branch...` });

	if (existsSync(buildDir)) {
		try {
			sendLog({ SOCKET_ROOM, logger, message: `[0] Trying to check out existing directory and do git pull at: ${buildDir}` });
			await execCmd(`cd '${buildDir}' && git checkout -f && git pull --rebase`);
		} catch (e) {
			sendLog({ SOCKET_ROOM, logger, message: `[1] Remove directory: ${buildDir} :>> ${e}` });
			fs.rmSync(buildDir, { recursive: true, force: true });

			sendLog({ SOCKET_ROOM, logger, message: `[1] Clone new into directory: ${buildDir}` });
			try {
				await execCmd(`git clone ${options.remoteSSH} --branch ${gitBranch} --single-branch ${buildDir}`);
			} catch (e2) {
				sendLog({ SOCKET_ROOM, logger, type: "error", message: `[1] Failed to clone new branch "${gitBranch}" to "${buildDir}": ${e}` });
				// await updateBuildStatus(appSlug, SOCKET_ROOM, "failed");
				// return;
			}
		}
	} else {
		try {
			sendLog({ SOCKET_ROOM, logger, message: `[2] Clone new to: ${buildDir}` });
			await execCmd(`git clone ${options.remoteSSH} --branch ${gitBranch} --single-branch ${buildDir}`);
		} catch (e) {
			sendLog({ SOCKET_ROOM, logger, type: "error", message: `[2] Failed to Clone new branch "${gitBranch}" to "${buildDir}": ${e}` });
			// await updateBuildStatus(appSlug, SOCKET_ROOM, "failed");
			// return;
		}
	}

	// emit socket message to "digirelease" app:
	sendLog({ SOCKET_ROOM, logger, message: `[START BUILD] Finished pulling latest files of "${gitBranch}"...` });

	let message = "";
	let stream;

	/**
	 * Check if Dockerfile existed
	 */
	let dockerFile = resolveDockerfilePath({ targetDirectory: buildDir, env });
	if (!dockerFile) {
		sendLog({
			SOCKET_ROOM,
			logger,
			type: "error",
			message: `[START BUILD] Missing "Dockerfile" to build the application, please create your "Dockerfile" in the root directory of the source code.`,
		});
		return;
	}

	/**
	 * Validating app deploy environment
	 */
	let serverDeployEnvironment = await getDeployEvironmentByApp(app, env);
	let isPassedDeployEnvironmentValidation = true;

	// validating...
	if (isEmpty(serverDeployEnvironment)) {
		sendLog({
			SOCKET_ROOM,
			logger,
			type: "error",
			message: `[START BUILD] Deploy environment (${env.toUpperCase()}) of "${appSlug}" app is empty (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (isEmpty(serverDeployEnvironment.cluster)) {
		sendLog({
			SOCKET_ROOM,
			logger,
			type: "error",
			message: `[START BUILD] Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "cluster" name (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (isEmpty(serverDeployEnvironment.namespace)) {
		sendLog({
			SOCKET_ROOM,
			logger,
			type: "error",
			message: `[START BUILD] Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "namespace" name (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (!isPassedDeployEnvironmentValidation) return;

	/**
	 * !!! IMPORTANT !!!
	 * Generate deployment data (YAML) & save the YAML deployment to "app.environment[env]"
	 * So it can be used to create release from build
	 */
	let deployment: GenerateDeploymentResult;
	sendLog({ SOCKET_ROOM, logger, message: `[START BUILD] Generating the deployment files on server...` });
	try {
		deployment = await generateDeployment({
			env,
			username,
			workspace,
			buildNumber,
			targetDirectory: options.targetDirectory,
		});
	} catch (e) {
		sendLog({ SOCKET_ROOM, logger, type: "error", message: e.message });
		return;
	}

	// console.log("deployment :>> ", deployment);
	const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = deployment;

	// update data to deploy environment:
	serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
	serverDeployEnvironment.deploymentYaml = deploymentContent;
	serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
	serverDeployEnvironment.updatedAt = new Date();
	serverDeployEnvironment.lastUpdatedBy = username;

	// Update {user}, {project}, {environment} to database before rolling out
	const updatedAppData = { environment: app.environment || {}, deployEnvironment: app.deployEnvironment || {} } as App;
	updatedAppData.lastUpdatedBy = username;
	updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

	const [updatedApp] = await DB.update<App>("app", { slug: appSlug }, updatedAppData);

	sendLog({ SOCKET_ROOM, logger, message: `[START BUILD] Generated the deployment files successfully!` });
	// log(`[BUILD] App's last updated by "${updatedApp.lastUpdatedBy}".`);

	// create new build on build server:
	let newBuild: Build;

	try {
		const buildData = {
			name: `[${options.env.toUpperCase()}] ${IMAGE_NAME}`,
			slug: SOCKET_ROOM,
			tag: buildNumber,
			status: "building",
			env,
			createdBy: username,
			projectSlug,
			appSlug,
			image: IMAGE_NAME,
			logs: logger.content,
			cliVersion: options.version,
			app: app._id,
			project: project._id,
			owner: author._id,
			workspace: workspace._id,
		} as Build;

		newBuild = await DB.create<Build>("build", buildData);

		sendLog({ SOCKET_ROOM, logger, message: "Created new build on server!" });
	} catch (e) {
		sendLog({ SOCKET_ROOM, logger, type: "error", message: "Can't create a new build in database: " + e.toString() });
		return;
	}

	// build the app with Docker:
	try {
		sendLog({ SOCKET_ROOM, logger, message: `Start building the Docker image...` });

		await builder.Docker.build(IMAGE_NAME, {
			platforms: ["linux/amd64"],
			builder: `${projectSlug.toLowerCase()}_${appSlug.toLowerCase()}`,
			cacheFroms: latestBuild ? [{ type: "registry", value: latestBuild.image }] : [],
			dockerFile: dockerFile,
			shouldPush: true,
			onBuilding: (msg) => sendLog({ SOCKET_ROOM, logger, message }),
		});

		// update build status as "success"
		await updateBuildStatus(appSlug, SOCKET_ROOM, "success");

		sendLog({
			SOCKET_ROOM,
			logger,
			message: `✓ Built a Docker image & pushed to container registry (${serverDeployEnvironment.registry}) successfully!`,
		});
	} catch (e) {
		await updateBuildStatus(appSlug, SOCKET_ROOM, "failed");
		sendLog({ SOCKET_ROOM, logger, message: e.message, type: "error" });
		return;
	}

	/**
	 * ! If this is a Next.js project, upload ".next/static" to CDN:
	 */
	// TODO: enable upload cdn while building source code:
	// const nextStaticDir = path.resolve(options.targetDirectory, ".next/static");
	// if (existsSync(nextStaticDir) && diginext.environment[env].cdn) {
	// 	options.secondAction = "push";
	// 	options.thirdAction = nextStaticDir;
	// 	await execCDN(options);
	// }

	// Insert this build record to server:
	let prereleaseDeploymentData = fetchDeploymentFromContent(prereleaseDeploymentContent);
	let releaseId: string, newRelease: Release;
	try {
		newRelease = await createReleaseFromBuild(newBuild, { author });
		releaseId = newRelease._id.toString();
		// log("Created new Release successfully:", newRelease);

		message = `✓ Created new release "${SOCKET_ROOM}" (ID: ${releaseId}) on BUILD SERVER successfully.`;
		sendLog({ SOCKET_ROOM, logger, message });
	} catch (e) {
		sendLog({ SOCKET_ROOM, logger, message: `${e.message}`, type: "error" });
		return;
	}

	if (!shouldRollout) {
		const buildDuration = dayjs().diff(startTime, "millisecond");

		message = chalk.green(`🎉 FINISHED BUILDING IMAGE AFTER ${humanizeDuration(buildDuration)} 🎉`);
		sendLog({ SOCKET_ROOM, logger, message, type: "success" });

		return { build: newBuild, release: newRelease };
	}

	/**
	 * ! [WARNING]
	 * ! If "--fresh" flag was specified, the deployment's namespace will be deleted & redeploy from scratch!
	 */
	console.log("[START BUILD] options.shouldUseFreshDeploy :>> ", options.shouldUseFreshDeploy);
	if (options.shouldUseFreshDeploy) {
		sendLog({
			SOCKET_ROOM,
			logger,
			type: "warn",
			message: `[SYSTEM WARNING] Flag "--fresh" of CLI was specified by "${username}" while executed request deploy command, the build server's going to delete the "${options.namespace}" namespace (APP: ${appSlug} / PROJECT: ${projectSlug}) shortly...`,
		});

		const wipedNamespaceRes = await ClusterManager.deleteNamespaceByCluster(options.namespace, serverDeployEnvironment.cluster);
		if (isEmpty(wipedNamespaceRes)) {
			sendLog({
				SOCKET_ROOM,
				logger,
				type: "error",
				message: `Unable to delete "${options.namespace}" namespace of "${serverDeployEnvironment.cluster}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
			});
			return;
		}

		sendLog({
			SOCKET_ROOM,
			logger,
			message: `Successfully deleted "${options.namespace}" namespace of "${serverDeployEnvironment.cluster}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
		});
	}

	if (releaseId) {
		sendLog({
			SOCKET_ROOM,
			logger,
			message:
				env === "prod"
					? `Rolling out the PRE-RELEASE deployment to "${env.toUpperCase()}" environment...`
					: `Rolling out the deployment to "${env.toUpperCase()}" environment...`,
		});

		try {
			const result = env === "prod" ? await ClusterManager.previewPrerelease(releaseId) : await ClusterManager.rollout(releaseId);

			if (result.error) {
				sendLog({ SOCKET_ROOM, logger, type: "error", message: `Failed to roll out the release :>> ${result.error}.` });
				return;
			}
			newRelease = result.data;
		} catch (e) {
			sendLog({ SOCKET_ROOM, logger, type: "error", message: `Failed to roll out the release :>> ${e.message}:` });
			return;
		}
	}

	// Print success:
	const deployDuration = dayjs().diff(startTime, "millisecond");

	message = chalk.green(`🎉 FINISHED DEPLOYING AFTER ${humanizeDuration(deployDuration)} 🎉`);
	sendLog({ SOCKET_ROOM, logger, message, type: "success" });

	if (env == "prod") {
		const { buildServerUrl } = getCliConfig();

		message = chalk.bold(chalk.yellow(`✓ Preview at: ${prereleaseDeploymentData.endpoint}`));
		sendLog({ SOCKET_ROOM, logger, message, type: "success" });

		message = chalk.bold(
			chalk.yellow(`✓ Review & publish at: ${buildServerUrl}/project/?lv1=release&project=${projectSlug}&app=${appSlug}&env=prod`)
		);
		sendLog({ SOCKET_ROOM, logger, message, type: "success" });

		message = chalk.bold(chalk.yellow(`✓ Roll out with CLI command:`), `$ dx rollout ${releaseId}`);
		sendLog({ SOCKET_ROOM, logger, message, type: "success" });
	} else {
		message = chalk.bold(chalk.yellow(`✓ Preview at: ${endpoint}`));
		sendLog({ SOCKET_ROOM, logger, message, type: "success" });
	}

	// disconnect CLI client:
	if (socketServer) socketServer.to(SOCKET_ROOM).emit("message", { action: "end" });

	// logSuccess(msg);
	return { build: newBuild, release: newRelease };
}
