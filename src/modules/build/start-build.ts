import chalk from "chalk";
import dayjs from "dayjs";
import { log, logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import humanizeDuration from "humanize-duration";
import { isEmpty } from "lodash";
import PQueue from "p-queue";
import path from "path";

import { getCliConfig } from "@/config/config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { IApp, IBuild, IRelease, IWorkspace } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchDeploymentFromContent } from "@/modules/deploy/fetch-deployment";
import { getGitProviderFromRepoSSH, Logger, pullOrCloneGitRepo, resolveDockerfilePath, wait } from "@/plugins";
import { MongoDB } from "@/plugins/mongodb";
import { socketIO } from "@/server";

import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import builder from "../builder";
import type { GenerateDeploymentResult } from "../deploy";
import { generateDeployment } from "../deploy";
import { verifySSH } from "../git";
import ClusterManager from "../k8s";
import { connectRegistry } from "../registry/connect-registry";
import { createReleaseFromBuild, sendLog, updateBuildStatus, updateBuildStatusByAppSlug } from "./index";

export let queue = new PQueue({ concurrency: 1 });

/**
 * Stop the build process.
 */
export const stopBuild = async (projectSlug: string, appSlug: string, buildSlug: string) => {
	const { DB } = await import("../api/DB");

	let error;

	// Validate...
	if (!appSlug) {
		error = `App "${appSlug}" not found.`;
		logError(`[STOP_BUILD]`, error);
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

/**
 * Start build the app with {InputOptions}
 * @deprecated
 */
export async function startBuildV1(
	options: InputOptions,
	addition: {
		/**
		 * @default true
		 */
		shouldRollout?: boolean;
	} = { shouldRollout: true }
) {
	const { DB } = await import("../api/DB");

	// parse variables
	const { shouldRollout = true } = addition;
	const startTime = dayjs();

	const { env = "dev", buildTag, buildImage, gitBranch, username = "Anonymous", projectSlug, slug: appSlug, namespace } = options;

	const latestBuild = await DB.findOne("build", { appSlug, projectSlug, status: "success" }, { order: { createdAt: -1 } });
	const app = await DB.findOne("app", { slug: appSlug }, { populate: ["owner", "workspace", "project"] });
	const project = await DB.findOne("project", { slug: projectSlug });
	const author = await DB.findOne("user", { _id: options.userId });
	const workspace = app.workspace as IWorkspace;

	// socket & logs
	const SOCKET_ROOM = `${appSlug}-${buildTag}`;
	const logger = new Logger(SOCKET_ROOM);
	options.SOCKET_ROOM = SOCKET_ROOM;

	// Emit socket message to request the BUILD SERVER to start building...
	socketIO?.to(SOCKET_ROOM).emit("message", { action: "start" });

	// Validating...
	if (!app) {
		sendLog({ SOCKET_ROOM, type: "error", message: `App "${appSlug}" not found.` });
		return;
	}

	log("options :>>", JSON.stringify(options));

	/**
	 * Specify BUILD DIRECTORY to pull source code:
	 * on build server, this is gonna be --> /mnt/build/{TARGET_DIRECTORY}/{REPO_BRANCH_NAME}
	 * /mnt/build/ -> additional disk (300GB) which mounted to this server on Digital Ocean.
	 */
	let buildDir = options.targetDirectory || process.cwd();

	const SOURCE_CODE = `cache/${options.projectSlug}/${options.slug}/${gitBranch}`;
	buildDir = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE);
	options.targetDirectory = buildDir;
	options.buildDir = buildDir;

	// detect "gitProvider":
	const gitProvider = getGitProviderFromRepoSSH(options.repoSSH);

	// create new build on build server:
	const buildData = {
		name: `[${options.env.toUpperCase()}] ${buildImage}`,
		slug: SOCKET_ROOM,
		tag: buildTag,
		status: "building",
		env,
		createdBy: username,
		projectSlug,
		appSlug,
		image: buildImage,
		logs: logger?.content,
		cliVersion: options.version,
		app: app._id,
		project: project._id,
		owner: author._id,
		workspace: workspace._id,
	} as IBuild;

	const newBuild = await DB.create("build", buildData);
	if (!newBuild) {
		console.log("buildData :>> ", buildData);
		sendLog({ SOCKET_ROOM, message: "Failed to create new build on server." });
		return;
	}
	sendLog({ SOCKET_ROOM, message: "Created new build on server!" });

	// verify SSH before pulling files...
	const gitAuth = await verifySSH({ gitProvider });
	if (!gitAuth) {
		sendLog({ SOCKET_ROOM, type: "error", message: `"${buildDir}" -> Failed to verify "${gitProvider}" git SSH key.` });
		await updateBuildStatus(newBuild, "failed");
		return;
	}

	// Git SSH verified -> start pulling now...
	sendLog({ SOCKET_ROOM, message: `Pulling latest source code from "${options.repoSSH}" at "${gitBranch}" branch...` });

	await pullOrCloneGitRepo(options.repoSSH, buildDir, gitBranch, { onUpdate: (message) => sendLog({ SOCKET_ROOM, message }) });

	// emit socket message to "digirelease" app:
	sendLog({ SOCKET_ROOM, message: `Finished pulling latest files of "${gitBranch}"...` });

	/**
	 * Check if Dockerfile existed
	 */
	let dockerFile = resolveDockerfilePath({ targetDirectory: buildDir, env });
	if (options.isDebugging) console.log("dockerFile :>> ", dockerFile);
	if (!dockerFile) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `Missing "Dockerfile" to build the application, please create your "Dockerfile" in the root directory of the source code.`,
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
			type: "error",
			message: `Deploy environment (${env.toUpperCase()}) of "${appSlug}" app is empty (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (isEmpty(serverDeployEnvironment.cluster)) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "cluster" name (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (isEmpty(serverDeployEnvironment.namespace)) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "namespace" name (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (!isPassedDeployEnvironmentValidation) return;

	/**
	 * Create namespace & imagePullScrets here!
	 * Because it will generate the name of secret to put into deployment yaml
	 */
	const cluster = await DB.findOne("cluster", { slug: serverDeployEnvironment.cluster });

	if (!cluster) {
		sendLog({ SOCKET_ROOM, type: "error", message: `Cluster "${serverDeployEnvironment.cluster}" not found` });
		return;
	}

	const { contextName: context } = cluster;

	if (!cluster) {
		sendLog({ SOCKET_ROOM, type: "error", message: `Cannot connect to cluster "${serverDeployEnvironment.cluster}" (context not found).` });
		return;
	}

	const isNsExisted = await ClusterManager.isNamespaceExisted(serverDeployEnvironment.namespace, { context });
	if (!isNsExisted) {
		const createNsResult = await ClusterManager.createNamespace(serverDeployEnvironment.namespace, { context });
		if (!createNsResult) {
			sendLog({ SOCKET_ROOM, type: "error", message: `Failed to create "${serverDeployEnvironment.namespace}" namespace.` });
			return;
		}
	}

	try {
		await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, serverDeployEnvironment.cluster, serverDeployEnvironment.namespace);
	} catch (e) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `Can't create "imagePullSecrets" in the "${serverDeployEnvironment.namespace}" namespace of "${serverDeployEnvironment.cluster}" cluster.`,
		});
		return;
	}

	/**
	 * !!! IMPORTANT !!!
	 * Generate deployment data (YAML) & save the YAML deployment to "app.deployEnvironment[env]"
	 * So it can be used to create release from build
	 */
	let deployment: GenerateDeploymentResult;
	sendLog({ SOCKET_ROOM, message: `Generating the deployment files on server...` });

	try {
		deployment = await generateDeployment({
			appSlug,
			env,
			username,
			workspace,
			buildTag: buildTag,
			targetDirectory: options.targetDirectory,
		});
	} catch (e) {
		// save log to database
		const { SystemLogService } = await import("@/services");
		const logSvc = new SystemLogService({ owner: author, workspace });
		logSvc.saveError(e, { name: "start-build" });

		sendLog({ SOCKET_ROOM, type: "error", message: e.message });
		return;
	}

	const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = deployment;
	// sendLog({ SOCKET_ROOM, message: deploymentContent });
	// if (env === "prod") sendLog({ SOCKET_ROOM, message: prereleaseDeploymentContent });

	// update data to deploy environment:
	serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
	serverDeployEnvironment.deploymentYaml = deploymentContent;
	serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
	serverDeployEnvironment.updatedAt = new Date();
	serverDeployEnvironment.lastUpdatedBy = username;

	// Update {user}, {project}, {environment} to database before rolling out
	const updatedAppData = { environment: app.environment || {}, deployEnvironment: app.deployEnvironment || {} } as IApp;
	updatedAppData.lastUpdatedBy = username;
	updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

	const [updatedApp] = await DB.update("app", { slug: appSlug }, updatedAppData);

	sendLog({ SOCKET_ROOM, message: `Generated the deployment files successfully!` });
	// log(`[BUILD] App's last updated by "${updatedApp.lastUpdatedBy}".`);

	// build the app with Docker:
	try {
		sendLog({ SOCKET_ROOM, message: `Start building the Docker image...` });

		// authenticate registry before building & pushing image
		const registry = await DB.findOne("registry", { slug: serverDeployEnvironment.registry });
		await connectRegistry(registry, { userId: author._id, workspaceId: workspace._id });

		const buildEngine = process.env.BUILDER === "docker" ? builder.Docker : builder.Podman;
		await buildEngine.build(buildImage, {
			platforms: ["linux/amd64"],
			builder: `${projectSlug.toLowerCase()}_${appSlug.toLowerCase()}`,
			cacheFroms: latestBuild ? [{ type: "registry", value: latestBuild.image }] : [],
			dockerFile: dockerFile,
			buildDirectory: buildDir,
			shouldPush: true,
			onBuilding: (message) => sendLog({ SOCKET_ROOM, message }),
		});

		// update build status as "success"
		await updateBuildStatus(newBuild, "success", { env });

		sendLog({
			SOCKET_ROOM,
			message: `✓ Built a Docker image & pushed to container registry (${serverDeployEnvironment.registry}) successfully!`,
		});
	} catch (e) {
		await updateBuildStatus(newBuild, "failed");
		sendLog({ SOCKET_ROOM, message: e.message, type: "error" });
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
	let releaseId: string, newRelease: IRelease;
	try {
		newRelease = await createReleaseFromBuild(newBuild, env, { author });
		releaseId = MongoDB.toString(newRelease._id);
		// log("Created new Release successfully:", newRelease);

		sendLog({ SOCKET_ROOM, message: `✓ Created new release "${SOCKET_ROOM}" (ID: ${releaseId}) on BUILD SERVER successfully.` });
	} catch (e) {
		sendLog({ SOCKET_ROOM, message: `${e.message}`, type: "error" });
		return;
	}

	if (!shouldRollout) {
		const buildDuration = dayjs().diff(startTime, "millisecond");

		sendLog({
			SOCKET_ROOM,
			message: chalk.green(`🎉 FINISHED BUILDING IMAGE AFTER ${humanizeDuration(buildDuration)} 🎉`),
			type: "success",
		});

		return { build: newBuild, release: newRelease };
	}

	/**
	 * ! [WARNING]
	 * ! If "--fresh" flag was specified, the deployment's namespace will be deleted & redeploy from scratch!
	 */
	console.log("options.shouldUseFreshDeploy :>> ", options.shouldUseFreshDeploy);
	if (options.shouldUseFreshDeploy) {
		sendLog({
			SOCKET_ROOM,
			type: "warn",
			message: `[SYSTEM WARNING] Flag "--fresh" of CLI was specified by "${username}" while executed request deploy command, the build server's going to delete the "${options.namespace}" namespace (APP: ${appSlug} / PROJECT: ${projectSlug}) shortly...`,
		});

		const wipedNamespaceRes = await ClusterManager.deleteNamespaceByCluster(options.namespace, serverDeployEnvironment.cluster);
		if (isEmpty(wipedNamespaceRes)) {
			sendLog({
				SOCKET_ROOM,
				type: "error",
				message: `Unable to delete "${options.namespace}" namespace of "${serverDeployEnvironment.cluster}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
			});
			return;
		}

		sendLog({
			SOCKET_ROOM,
			message: `Successfully deleted "${options.namespace}" namespace of "${serverDeployEnvironment.cluster}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
		});
	}

	if (releaseId) {
		sendLog({
			SOCKET_ROOM,
			message:
				env === "prod"
					? `Rolling out the PRE-RELEASE deployment to "${env.toUpperCase()}" environment...`
					: `Rolling out the deployment to "${env.toUpperCase()}" environment...`,
		});

		const onRolloutUpdate = (msg: string) => sendLog({ SOCKET_ROOM, message: msg });

		try {
			const result =
				env === "prod"
					? await ClusterManager.previewPrerelease(releaseId, { onUpdate: onRolloutUpdate })
					: await ClusterManager.rollout(releaseId, { onUpdate: onRolloutUpdate });

			if (result.error) {
				sendLog({ SOCKET_ROOM, type: "error", message: `Failed to roll out the release :>> ${result.error}.` });
				return;
			}
			newRelease = result.data;
		} catch (e) {
			sendLog({ SOCKET_ROOM, type: "error", message: `Failed to roll out the release :>> ${e.message}:` });
			return;
		}
	}

	// Print success:
	const deployDuration = dayjs().diff(startTime, "millisecond");

	sendLog({ SOCKET_ROOM, message: chalk.green(`🎉 FINISHED DEPLOYING AFTER ${humanizeDuration(deployDuration)} 🎉`), type: "success" });

	if (env == "prod") {
		const { buildServerUrl } = getCliConfig();
		const rollOutUrl = `${buildServerUrl}/project/?lv1=release&project=${projectSlug}&app=${appSlug}&env=prod`;

		sendLog({ SOCKET_ROOM, message: chalk.bold(chalk.yellow(`✓ Preview at: ${prereleaseDeploymentData.endpoint}`)), type: "success" });

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
		sendLog({ SOCKET_ROOM, message: chalk.bold(chalk.yellow(`✓ Preview at: ${endpoint}`)), type: "success" });
	}

	// i don't know, just for sure...
	await wait(2000);

	// disconnect CLI client:
	socketIO?.to(SOCKET_ROOM).emit("message", { action: "end" });

	// logSuccess(msg);
	return { build: newBuild, release: newRelease };
}
