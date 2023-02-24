import chalk from "chalk";
import { isJSON } from "class-validator";
import dayjs from "dayjs";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import type { ExecaChildProcess } from "execa";
import execa from "execa";
import fs, { existsSync } from "fs";
import humanizeDuration from "humanize-duration";
import { ObjectId } from "mongodb";
import PQueue from "p-queue";
import path from "path";
import { simpleGit } from "simple-git";

import { cliOpts, getCliConfig } from "@/config/config";
import type { App, Build, Project, Release, User } from "@/entities";
import type { DeployEnvironment } from "@/interfaces";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchDeploymentFromContent } from "@/modules/deploy/fetch-deployment";
import { execCmd, getAppConfig, getGitProviderFromRepoSSH, Logger, resolveDockerfilePath, wait } from "@/plugins";
import { getIO } from "@/server";

import { DB } from "../api/DB";
import { generateDeployment } from "../deploy";
import { verifySSH } from "../git";
import ClusterManager from "../k8s";
import { createReleaseFromBuild, sendMessage, updateBuildStatus } from "./index";

type IProcessCommand = {
	[key: string]: ExecaChildProcess;
};

const processes: IProcessCommand = {};

export let queue = new PQueue({ concurrency: 1 });

/**
 * Stop the build process.
 */
export const stopBuild = async (appSlug: string, buildSlug: string) => {
	let error;

	// Validate...
	if (!processes[buildSlug]) {
		error = `[IGNORE] Build "${buildSlug}" not found (it might be stopped already).`;
		logWarn(error);
		// return { error };
	}

	if (!appSlug) {
		error = `App "${appSlug}" not found.`;
		logError(error);
		return { error };
	}

	// Kill the f*cking build process...
	try {
		processes[buildSlug].kill("SIGTERM", { forceKillAfterTimeout: 2000 });
	} catch (e) {
		logWarn(`[IGNORE] Cannot stop the build process of "${buildSlug}": ${e}`);
	}

	// Stop the f*cking buildx driver...
	await execCmd(`docker buildx stop ${appSlug.toLowerCase()}`);
	await wait(100);

	// Update the status in the database
	const stoppedBuild = await updateBuildStatus(appSlug, buildSlug, "failed");
	delete processes[buildSlug];

	logSuccess(`Build process of "${buildSlug}" has been stopped.`);

	return stoppedBuild;
};

/**
 * Start build the app with {InputOptions}
 */
export async function startBuild(options: InputOptions, addition: { shouldRollout?: boolean } = {}) {
	// parse variables
	const { shouldRollout = true } = addition;
	const startTime = dayjs();

	const { env = "dev", buildNumber, buildImage, projectName, gitBranch, username = "Anonymous", projectSlug, slug: appSlug } = options;

	const BUILD_NUMBER = buildNumber;
	const IMAGE_NAME = buildImage;
	const SOCKET_ROOM = `${appSlug}-${BUILD_NUMBER}`;

	const logger = new Logger(SOCKET_ROOM);
	options.SOCKET_ROOM = SOCKET_ROOM;

	// Emit socket message to request the BUILD SERVER to start building...
	let socketServer = getIO();
	if (socketServer) socketServer.to(SOCKET_ROOM).emit("message", { action: "start" });

	/**
	 * Specify BUILD DIRECTORY to pull source code:
	 * on build server, this is gonna be --> /mnt/build/{TARGET_DIRECTORY}/{REPO_BRANCH_NAME}
	 * /mnt/build/ -> additional disk (300GB) which mounted to this server on Digital Ocean.
	 */
	let buildDir = options.targetDirectory || process.cwd();
	// log(`BUILD_DIR >`, buildDir);

	// ! nếu build trên máy local thì ko cần GIT pull
	if (process.env.PROJECT_DIR) {
		const dirName = `${options.projectSlug}-${options.slug}`;
		buildDir = path.resolve(process.env.PROJECT_DIR, dirName, gitBranch);
		options.targetDirectory = buildDir;

		// detect "gitProvider":
		const gitProvider = getGitProviderFromRepoSSH(options.remoteSSH);

		// verify SSH before pulling files...
		try {
			await verifySSH({ gitProvider });
		} catch (e) {
			sendMessage({ SOCKET_ROOM, logger, message: `"${buildDir}" -> Failed to verify "${gitProvider}" git SSH key.` });
			throw new Error(e);
		}

		// Git SSH verified -> start pulling now...
		sendMessage({ SOCKET_ROOM, logger, message: `"${buildDir}" -> Pulling latest files...` });

		if (existsSync(buildDir)) {
			try {
				await execa.command(`cd ${buildDir} && git checkout -f && git pull --rebase`, cliOpts);
			} catch (e) {
				fs.rmSync(buildDir, { recursive: true, force: true });
				await execa("git", ["clone", options.remoteSSH, "--branch", gitBranch, "--single-branch", buildDir], cliOpts);
			}
		} else {
			try {
				await execa("git", ["clone", options.remoteSSH, "--branch", gitBranch, "--single-branch", buildDir], cliOpts);
			} catch (e) {
				sendMessage({ SOCKET_ROOM, logger, message: `Failed to pull branch "${gitBranch}" to "${buildDir}": ${e}` });

				throw new Error(e);
			}
		}

		// emit socket message to "digirelease" app:
		sendMessage({ SOCKET_ROOM, logger, message: `Finished pulling latest files of "${gitBranch}"...` });
	}

	// initialize GIT in this app source directory:
	const git = simpleGit(buildDir, { binary: "git" });
	const gitStatus = await git.status(["-s"]);
	options.gitBranch = gitStatus.current;
	options.buildDir = buildDir;

	// if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	const appConfig = getAppConfig(buildDir);

	// [SYNC] apply "appConfig" -> "options"
	options.remoteSSH = appConfig.git.repoSSH;
	options.remoteURL = appConfig.git.repoURL;
	options.projectSlug = projectSlug;
	options.slug = appSlug;

	// log(`startBuild > appConfig.environment[${env}] :>>`, appConfig.environment[env]);

	// [SYNC] apply "appConfig" -> "options"
	options.gitProvider = appConfig.git.provider;
	options.shouldInherit = appConfig.environment[env].shouldInherit;
	options.redirect = appConfig.environment[env].redirect;
	options.provider = appConfig.environment[env].provider;
	options.cluster = appConfig.environment[env].cluster;
	options.zone = appConfig.environment[env].zone;
	options.replicas = appConfig.environment[env].replicas;
	options.size = appConfig.environment[env].size;
	options.port = appConfig.environment[env].port;
	options.ssl = appConfig.environment[env].ssl != "none";
	options.namespace = appConfig.environment[env].namespace;

	log("options :>>", options);

	const latestBuild = await DB.findOne<Build>("build", { appSlug, projectSlug, status: "success" }, { order: { createdAt: "DESC" } });
	const app = await DB.findOne<App>("app", { slug: appSlug });
	const project = await DB.findOne<Project>("project", { slug: projectSlug });
	const author = await DB.findOne<User>("user", { id: new ObjectId(options.userId) });

	// log(`[BUILD] latestBuild :>>`, latestBuild);
	// log(`[BUILD] app :>>`, app);
	// log(`[BUILD] project :>>`, project);
	// log("[BUILD] author :>> ", author);

	options.appSlug = appSlug;
	options.projectName = project.name;
	options.name = app.name;

	// log(`startBuild > options :>>`, options);

	let message = "";
	let stream;

	let targetEnvironmentFromDB = {};
	if (app.environment && app.environment[env]) {
		if (isJSON(app.environment[env])) {
			targetEnvironmentFromDB = JSON.parse(app.environment[env] as string) as DeployEnvironment;
		} else {
			targetEnvironmentFromDB = app.environment[env] as DeployEnvironment;
		}
	}

	// Merge the one from appConfig with the one from database
	const targetEnvironment = { ...appConfig.environment[env], ...targetEnvironmentFromDB } as DeployEnvironment;

	/**
	 * !!! IMPORTANT !!!
	 * Generate deployment data (YAML) & save the YAML deployment to "app.environment[env]"
	 * So it can be used to create release from build
	 */
	const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = await generateDeployment(options);

	targetEnvironment.prereleaseUrl = prereleaseUrl;
	targetEnvironment.deploymentYaml = deploymentContent;
	targetEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;

	// Update {user}, {project}, {environment} to database before rolling out
	const updatedAppData = { environment: app.environment } as App;
	updatedAppData.environment[env] = JSON.stringify(targetEnvironment);
	updatedAppData.lastUpdatedBy = options.username;

	const [updatedApp] = await DB.update<App>("app", { slug: appConfig.slug }, updatedAppData);
	log(`[BUILD] App's last updated by "${updatedApp.lastUpdatedBy}".`);

	// create new build on build server:
	let newBuild;
	try {
		const buildData = {
			name: `[${options.env.toUpperCase()}] ${IMAGE_NAME}`,
			slug: SOCKET_ROOM,
			tag: buildNumber,
			status: "building" as "start" | "building" | "failed" | "success",
			env,
			createdBy: username,
			projectSlug,
			appSlug,
			image: IMAGE_NAME,
			app: app._id,
			project: project._id,
			owner: options.userId,
			workspace: options.workspace._id,
		};

		newBuild = await DB.create<Build>("build", buildData);

		message = "[SUCCESS] created new build on server!";
		sendMessage({ SOCKET_ROOM, logger, message });
	} catch (e) {
		logError(e);
		message = "[FAILED] can't create a new build in database: " + e.toString();
		sendMessage({ SOCKET_ROOM, logger, message });

		return;
	}

	// return;

	const appDirectory = options.buildDir;

	// TODO: authenticate container registry?

	// build the app with Docker:
	try {
		sendMessage({ SOCKET_ROOM, logger, message: `Start building the Docker image...` });

		// check if using framework version >= 1.3.6
		// let dockerFile = path.resolve(appDirectory, `Dockerfile`);
		let dockerFile = resolveDockerfilePath({ targetDirectory: appDirectory, env });
		if (!dockerFile) throw new Error(`Missing "Dockerfile" to build the application, please create one.`);

		/**
		 * ! Change current working directory to the root of this project repository
		 **/
		process.chdir(buildDir);

		/**
		 * ! BUILD CACHING
		 * Activate the "docker-container" driver before using "buildx"
		 * use "buildx" with cache to increase build speed
		 * docker buildx build -f Dockerfile --push -t asia.gcr.io/top-group-k8s/test-cli/front-end:2022-12-26-23-20-07 --cache-from type=registry,ref=asia.gcr.io/top-group-k8s/test-cli/front-end:2022-12-26-23-20-07 .
		 **/
		// activate docker build (with "buildx" driver)...
		await execCmd(`docker buildx create --driver docker-container --name ${appSlug.toLowerCase()}`, "Docker BuildX instance was existed.");

		const cacheCmd = latestBuild ? ` --cache-from type=registry,ref=${latestBuild.image}` : "";
		const buildCmd = `docker buildx build --platform=linux/x86_64 -f ${dockerFile} --push -t ${IMAGE_NAME}${cacheCmd} --builder=${appSlug.toLowerCase()} .`;
		// log(`Build command: "${buildCmd}"`);

		stream = execa.command(buildCmd, cliOpts);

		// add to process collection so we can kill it if needed:
		processes[SOCKET_ROOM] = stream;

		stream.stdio.forEach((_stdio) => {
			if (_stdio) {
				_stdio.on("data", (data) => {
					message = data.toString();
					// send messages to CLI client:
					sendMessage({ SOCKET_ROOM, logger, message });
				});
			}
		});
		await stream;

		// update build status as "success"
		await updateBuildStatus(appSlug, SOCKET_ROOM, "success");

		message = `✓ Built a Docker image & pushed to container registry (${appConfig.environment[env].registry}) successfully!`;
		sendMessage({ SOCKET_ROOM, logger, message });
	} catch (e) {
		await updateBuildStatus(appSlug, SOCKET_ROOM, "failed");

		sendMessage({ SOCKET_ROOM, logger, message: e.toString() });
		logError(e);

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

	if (!shouldRollout) {
		const buildDuration = dayjs().diff(startTime, "millisecond");
		message = chalk.green(`🎉 FINISHED BUILDING AFTER ${humanizeDuration(buildDuration)} 🎉`);
		message += `\n  - Image: ${IMAGE_NAME}`;
		logSuccess(message);

		sendMessage({ SOCKET_ROOM, logger, message });
		return true;
	}

	// Insert this build record to server:
	// let prereleaseDeploymentData = fetchDeployment(PRERELEASE_DEPLOYMENT_FILE, options);
	let prereleaseDeploymentData = fetchDeploymentFromContent(prereleaseDeploymentContent);
	let releaseId;
	try {
		const newRelease = await createReleaseFromBuild(newBuild, { author: author as User });
		// log("Created new Release successfully:", newRelease);

		releaseId = (newRelease as Release)._id;

		message = `✓ Created new release "${SOCKET_ROOM}" (ID: ${releaseId}) on BUILD SERVER successfully.`;
		sendMessage({ SOCKET_ROOM, logger, message });
	} catch (e) {
		sendMessage({ SOCKET_ROOM, logger, message: `[ERROR] ${e.message}` });
		return;
	}

	// rolling out

	/**
	 * !!! IMPORTANT NOTE !!!
	 * ! Sử dụng QUEUE để apply deployment lên từng cluster một,
	 * ! không để tình trạng concurrent deploy làm deploy lên nhầm lẫn cluster
	 */
	if (releaseId) {
		try {
			await queue.add(() => (env === "prod" ? ClusterManager.previewPrerelease(releaseId) : ClusterManager.rollout(releaseId)));
		} catch (e) {
			logError(`Queue job failed -> ClusterManager.rollout() -> ${e.message}:`, { options });
		}
	}

	// Print success:
	const deployDuration = dayjs().diff(startTime, "millisecond");

	message = chalk.green(`🎉 FINISHED DEPLOYING AFTER ${humanizeDuration(deployDuration)} 🎉`);
	sendMessage({ SOCKET_ROOM, logger, message });

	if (env == "prod") {
		const { buildServerUrl } = getCliConfig();

		message = chalk.bold(chalk.yellow(`✓ Preview at: ${prereleaseDeploymentData.endpoint}`));
		sendMessage({ SOCKET_ROOM, logger, message });

		message = chalk.bold(
			chalk.yellow(`✓ Review & publish at: ${buildServerUrl}/project/?lv1=release&project=${projectSlug}&app=${appSlug}&env=prod`)
		);
		sendMessage({ SOCKET_ROOM, logger, message });

		message = chalk.bold(chalk.yellow(`✓ Roll out with CLI command:`), `$ dx rollout ${releaseId}`);
		sendMessage({ SOCKET_ROOM, logger, message });
	} else {
		message = chalk.bold(chalk.yellow(`✓ Preview at: ${endpoint}`));
		sendMessage({ SOCKET_ROOM, logger, message });
	}

	// disconnect CLI client:
	if (socketServer) socketServer.to(SOCKET_ROOM).emit("message", { action: "end" });

	// logSuccess(msg);
	return true;
}
