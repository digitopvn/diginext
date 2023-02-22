import chalk from "chalk";
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

import { isServerMode } from "@/app.config";
import { cliOpts, getCliConfig } from "@/config/config";
import type { App, Build, Project, Release, User } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchDeploymentFromContent } from "@/modules/deploy/fetch-deployment";
import { execCmd, getAppConfig, getGitProviderFromRepoSSH, Logger, wait } from "@/plugins";
import { getIO } from "@/server";
import { BuildService, ContainerRegistryService, ProjectService, UserService } from "@/services";
import AppService from "@/services/AppService";

import { fetchApi } from "../api";
import { generateDeployment } from "../deploy";
import { verifySSH } from "../git";
import ClusterManager from "../k8s";
import { createReleaseFromBuild, saveLogs, sendMessage, updateBuildStatus } from "./index";

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
			// save logs to database
			saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));

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

				// save logs to database
				saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));

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

	// log("options :>>", options);

	// back-end service

	let latestBuild, app, project, author;
	let appSvc, buildSvc, projectSvc, userSvc;

	if (isServerMode) {
		appSvc = new AppService();
		buildSvc = new BuildService();
		projectSvc = new ProjectService();
		userSvc = new UserService();
		// const clusterSvc = new ClusterService();
		const registrySvc = new ContainerRegistryService();

		latestBuild = await buildSvc.findOne({ appSlug, projectSlug, status: "success" });
		app = await appSvc.findOne({ slug: appSlug });
		project = await projectSvc.findOne({ slug: projectSlug });
		author = await userSvc.findOne({ id: new ObjectId(options.userId) });
	} else {
		const { data: builds } = await fetchApi<Build>({ url: `/api/v1/build?appSlug=${appSlug}&projectSlug=${projectSlug}&status=success` });
		latestBuild = builds[0];

		const { data: apps } = await fetchApi<App>({ url: `/api/v1/app?slug=${appSlug}` });
		app = apps[0];

		const { data: projects } = await fetchApi<Project>({ url: `/api/v1/project?slug=${projectSlug}` });
		project = projects[0];

		const { data: user } = await fetchApi<User>({ url: `/api/v1/user?id=${options.userId}` });
		author = user;
	}

	log(`latestBuild :>>`, latestBuild);
	log(`app :>>`, app);
	log(`project :>>`, project);
	log("author :>> ", author);

	options.appSlug = appSlug;
	options.projectName = project.name;
	options.name = app.name;

	// log(`startBuild > options :>>`, options);

	let message = "";
	let stream;

	/**
	 * !!! IMPORTANT !!!
	 * Generate deployment data (YAML) & save the YAML deployment to "app.environment[env]"
	 * So it can be used to create release from build
	 */
	const { endpoint, deploymentContent, prereleaseDeploymentContent } = await generateDeployment(options);
	appConfig.environment[env].deploymentYaml = deploymentContent;
	appConfig.environment[env].prereleaseDeploymentYaml = prereleaseDeploymentContent;

	// Update {user}, {project}, {environment} to database before rolling out
	const updatedAppData: any = {};
	updatedAppData[`environment.${env}`] = JSON.stringify(appConfig.environment[env]);
	updatedAppData.lastUpdatedBy = options.username;

	if (isServerMode) {
		const updatedApp = await appSvc.update({ slug: appConfig.slug }, updatedAppData);
	} else {
		const { status, data: updatedApp } = await fetchApi<App>({
			url: `/api/v1/app?slug=${appConfig.slug}`,
			method: "PATCH",
			data: updatedAppData,
		});
	}

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

		if (isServerMode) {
			newBuild = await buildSvc.create(buildData);
		} else {
			const { data } = await fetchApi<Build>({
				url: "/api/v1/build",
				method: "POST",
				data: buildData,
			});
			// log(`startBuild > create build :>>`, data);
			newBuild = data as Build;
		}

		message = "[SUCCESS] created new build on server!";
		sendMessage({ SOCKET_ROOM, logger, message });
	} catch (e) {
		logError(e);
		message = "[FAILED] can't create a new build in database: " + e.toString();
		sendMessage({ SOCKET_ROOM, logger, message });

		// save logs to database
		saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));

		return;
	}

	// return;

	const appDirectory = options.buildDir;

	// Prepare deployment YAML files:
	// const DEPLOYMENT_FILE = path.resolve(appDirectory, `deployment/deployment.${env}.yaml`);
	// const DEPLOYMENT_YAML = fs.readFileSync(DEPLOYMENT_FILE, "utf8");
	// const PRERELEASE_DEPLOYMENT_FILE = path.resolve(appDirectory, "deployment/deployment.prerelease.yaml");
	// const PRERELEASE_DEPLOYMENT_YAML = fs.readFileSync(PRERELEASE_DEPLOYMENT_FILE, "utf8");
	// const deploymentData = fetchDeployment(DEPLOYMENT_FILE, options);

	// TODO: authenticate container registry?

	// build the app with Docker:
	try {
		sendMessage({ SOCKET_ROOM, logger, message: `Start building the Docker image...` });

		// check if using framework version >= 1.3.6
		let dockerFile = path.resolve(appDirectory, `Dockerfile`);
		if (!existsSync(dockerFile)) {
			message = `[ERROR] Missing "${appDirectory}/deployment/Dockerfile" file, please create one.`;
			sendMessage({ SOCKET_ROOM, logger, message: message });
			logError(message);

			// save logs to database
			saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));

			await updateBuildStatus(appSlug, SOCKET_ROOM, "failed");

			return;
		}

		/**
		 * ! Change current working directory to the root of this project repository
		 **/
		process.chdir(buildDir);

		/**
		 * ! BUILD CACHING
		 * Activate the "docker-container" driver before using "buildx"
		 * use "buildx" with cache to increase build speed
		 * docker buildx build -f deployment/Dockerfile.dev --push -t asia.gcr.io/top-group-k8s/test-cli/front-end:2022-12-26-23-20-07 --cache-from type=registry,ref=asia.gcr.io/top-group-k8s/test-cli/front-end:2022-12-26-23-20-07 .
		 **/
		// activate docker build (with "buildx" driver)...
		execCmd(`docker buildx create --driver docker-container --name ${appSlug.toLowerCase()}`);

		const cacheCmd = latestBuild ? ` --cache-from type=registry,ref=${latestBuild.image}` : "";
		const buildCmd = `docker buildx build --platform=linux/x86_64 -f ${dockerFile} --push -t ${IMAGE_NAME}${cacheCmd} --builder=${appSlug.toLowerCase()} .`;
		// log(`Build command: "${buildCmd}"`);

		// add to process collection so we can kill it if needed:
		// const abort = new AbortController();
		stream = execa.command(buildCmd, cliOpts);
		// const args = ["buildx", "build", "--platform=linux/x86_64", "-f", dockerFile, "--push", "-t", IMAGE_NAME];
		// if (latestBuild) args.push("--cache-from", `type=registry,ref=${latestBuild.image}`);
		// stream = execa("docker", args, { ...cliOpts, killSignal: abort.signal });
		processes[SOCKET_ROOM] = stream;

		// stream = execa("docker", ["build", "--platform=linux/x86_64", "-t", IMAGE_NAME, "-f", dockerFile, "."]);
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

		message = `✌️ Built a Docker image & pushed to container registry (${appConfig.environment[env].registry}) successfully!`;
		sendMessage({ SOCKET_ROOM, logger, message });

		// Update deployment data to app:
		// const updateData = {};
		// updateData[`environment.${env}`] = appConfig.environment[env];
		// const updatedApp = await appSvc.update({ id: app._id }, updateData);
		// log(`Updated deploy environment (${env}) to "${appSlug}" app:`, updatedApp);

		// save logs to database
		saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));
	} catch (e) {
		await updateBuildStatus(appSlug, SOCKET_ROOM, "failed");
		sendMessage({ SOCKET_ROOM, logger, message: e.toString() });
		logError(e);

		// save logs to database
		saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));

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
		let buildFinishMsg = chalk.green(`🎉 FINISHED BUILDING AFTER ${humanizeDuration(buildDuration)} 🎉`);
		buildFinishMsg += `\n  - Image: ${IMAGE_NAME}`;
		logSuccess(buildFinishMsg);

		// save logs to database
		saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));

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

		message = `Created new release "${SOCKET_ROOM}" (ID: ${releaseId}) on BUILD SERVER successfully.`;
		sendMessage({ SOCKET_ROOM, logger, message });
	} catch (e) {
		sendMessage({ SOCKET_ROOM, logger, message: `[ERROR] ${e.message}` });
		// return;
	}

	// rolling out
	/**
	 * !!! IMPORTANT NOTE !!!
	 * ! Sử dụng QUEUE để apply deployment lên từng cluster một,
	 * ! không để tình trạng concurrent deploy làm deploy lên nhầm lẫn cluster
	 */
	// await queueKubeApply(options);
	if (releaseId) {
		try {
			await queue.add(() => ClusterManager.rollout(releaseId));
		} catch (e) {
			log(`Queue job failed -> ClusterManager.rollout() -> ${e.message}:`, { options });
		}
	}

	// Print success:
	const deployDuration = dayjs().diff(startTime, "millisecond");

	let msg = chalk.green(`🎉 FINISHED DEPLOYING AFTER ${humanizeDuration(deployDuration)} 🎉`);

	if (env == "prod") {
		const { buildServerUrl } = getCliConfig();
		msg += chalk.bold(chalk.yellow(`\n -> Preview at: ${prereleaseDeploymentData.endpoint}`));
		msg += chalk.bold(chalk.yellow(`\n -> Review & publish at: ${buildServerUrl}/release/${projectSlug}`));
		msg += chalk.bold(chalk.yellow(`\n -> Roll out with CLI command:`), `$ dx rollout ${releaseId}`);
	} else {
		msg += chalk.bold(chalk.yellow(`\n -> Preview at: ${endpoint}`));
	}

	sendMessage({ SOCKET_ROOM, logger, message: msg });

	// save logs to database
	saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));

	// disconnect CLI client:
	if (socketServer) socketServer.to(SOCKET_ROOM).emit("message", { action: "end" });

	// logSuccess(msg);
	return true;
}
