import { isEmpty, isUndefined } from "lodash";
import path from "path";

import { isServerMode } from "@/app.config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { IApp, IBuild, ICluster, IProject, IRelease, IUser, IWebhook, IWorkspace } from "@/entities";
import { filterUniqueItems } from "@/plugins/array";
import { MongoDB } from "@/plugins/mongodb";
import { WebhookService } from "@/services";

import { getAppConfigFromApp } from "../apps/app-helper";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { updateAppConfig } from "../apps/update-config";
import { createReleaseFromBuild, sendLog } from "../build";
import { updateReleaseStatusById } from "../build/update-release-status";
import ClusterManager from "../k8s";
import { deployBuild } from "./deploy-build";
import type { GenerateDeploymentResult } from "./generate-deployment";
import getDeploymentName from "./generate-deployment-name";
import type { GenerateDeploymentV2Result } from "./generate-deployment-v2";
import { generateDeploymentV2 } from "./generate-deployment-v2";

export type DeployBuildV2Options = {
	/**
	 * ### `REQUIRED`
	 * Target deploy environment
	 */
	env: string;
	/**
	 * ### `REQUIRED`
	 * The USER who process this request
	 */
	owner: IUser;
	/**
	 * ### `REQUIRED`
	 * Workspace
	 */
	workspace: IWorkspace;
	/**
	 * App's exposed port
	 */
	port?: number;
	/**
	 * Select target cluster (by slug) to deploy
	 */
	clusterSlug?: string;
	/**
	 * Current version of the Diginext CLI
	 */
	cliVersion?: string;
	/**
	 * ### CAUTION
	 * If `TRUE`, it will find and wipe out the current deployment, then deploy a new one!
	 */
	shouldUseFreshDeploy?: boolean;
	/**
	 * ### ONLY APPLY FOR DEPLOYING to PROD
	 * Force roll out the release to "prod" deploy environment (skip the "prerelease" environment)
	 * @default false
	 * @deprecated
	 */
	forceRollOut?: boolean;
	/**
	 * ### WARNING
	 * Skip checking deployed POD's ready status.
	 * - The response status will always be SUCCESS even if the pod is unable to start up properly.
	 * @default false
	 */
	skipReadyCheck?: boolean;
	/**
	 * ### WARNING
	 * Skip watching the progress of deployment, let it run in background, won't return the deployment's status.
	 * @default true
	 */
	deployInBackground?: boolean;
};

export type DeployBuildV2Result = {
	app: IApp;
	build: IBuild;
	release: IRelease;
	deployment: GenerateDeploymentResult;
	endpoint: string;
	// prerelease: FetchDeploymentResult;
};

export const processDeployBuildV2 = async (build: IBuild, release: IRelease, cluster: ICluster, options: DeployBuildV2Options) => {
	const { env, owner, shouldUseFreshDeploy = false, skipReadyCheck = false, forceRollOut = false } = options;
	const { appSlug, projectSlug, tag: buildTag } = build;
	const { slug: username } = owner;
	const SOCKET_ROOM = `${appSlug}-${buildTag}`;
	const releaseId = MongoDB.toString(release._id);
	const { DB } = await import("@/modules/api/DB");
	const workspace = await DB.findOne("workspace", { _id: build.workspace });

	// webhook
	const webhookSvc = new WebhookService();
	webhookSvc.ownership = { owner, workspace };
	const webhook = await DB.findOne("webhook", { release: releaseId });

	// mark build & release as "failed" status
	const markBuildAndReleaseAsFailed = async () => {
		// update build
		const _build = await DB.update(
			"build",
			{ _id: build._id },
			{ deployStatus: "failed" },
			{
				select: ["_id", "status", "deployStatus"],
			}
		).catch(console.error);
		// update release
		const _release = await DB.update(
			"release",
			{ _id: release._id },
			{ status: "failed" },
			{
				select: ["_id", "status", "buildStatus"],
			}
		).catch(console.error);

		console.log("markBuildAndReleaseAsFailed() > _build :>> ", _build);
		console.log("markBuildAndReleaseAsFailed() > _release :>> ", _release);
	};

	// stop deployment if release is undefined
	if (!release) {
		// update "deployStatus" in a build & a release
		await markBuildAndReleaseAsFailed().catch(console.error);

		const msg = `❌ Unable to find release for build "${buildTag}".`;
		sendLog({ SOCKET_ROOM, message: msg, type: "error", action: "end" });
		throw new Error(msg);
	}

	// authenticate cluster & switch to that cluster's context
	try {
		await ClusterManager.authCluster(cluster, { ownership: { owner, workspace } });
		sendLog({ SOCKET_ROOM, message: `✓ Connected to "${cluster.name}" (context: ${cluster.contextName}).` });
	} catch (e) {
		// update "deployStatus" in a build & a release
		await markBuildAndReleaseAsFailed();

		sendLog({ SOCKET_ROOM, message: `❌ Unable to connect the cluster: ${e.message}`, type: "error", action: "end" });
		throw new Error(e.message);
	}

	// target environment info
	const { contextName: context } = cluster;
	const { namespace, endpoint } = release;

	/**
	 * Create namespace & imagePullScrets here!
	 * Because it will generate the name of secret to put into deployment yaml
	 */
	const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
	if (isUndefined(isNsExisted)) {
		// update "deployStatus" in a build & a release
		await markBuildAndReleaseAsFailed();

		sendLog({ SOCKET_ROOM, message: `❌ Unable to connect cluster to get namespace list.`, type: "error", action: "end" });
		throw new Error(`Unable to connect cluster to get namespace list.`);
	}
	if (!isNsExisted) {
		const createNsResult = await ClusterManager.createNamespace(namespace, { context });
		if (!createNsResult) throw new Error(`Unable to create new namespace: ${namespace}`);
	}

	/**
	 * Checking "imagePullSecrets" in a namepsace
	 */
	try {
		const { name: imagePullSecretName } = await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, cluster.slug, namespace);
		sendLog({
			SOCKET_ROOM,
			message: `Created "${imagePullSecretName}" imagePullSecrets in the "${namespace}" namespace.`,
		});
	} catch (e) {
		// update "deployStatus" in a build & a release
		await markBuildAndReleaseAsFailed();

		sendLog({
			SOCKET_ROOM,
			type: "error",
			action: "end",
			message: `Can't create "imagePullSecrets" in the "${namespace}" namespace: ${e}`,
		});
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		throw new Error(`Can't create "imagePullSecrets" in the "${namespace}" namespace.`);
	}

	/**
	 * Checking NGINX Ingress:
	 * - If there are a similar domain in different namespace -> throw error
	 */
	try {
		const allIngresses = await ClusterManager.getAllIngresses({ context });
		let namespaceOfExistingIngress;
		const ingInAnotherNamespace = allIngresses.find((ing) => {
			const findCondition =
				typeof ing.spec.rules.find((rule) => rule.host === endpoint) !== "undefined" && ing.metadata.namespace !== namespace;
			if (findCondition) namespaceOfExistingIngress = ing.metadata.namespace;
			return findCondition;
		});
		if (ingInAnotherNamespace) {
			// update "deployStatus" in a build & a release
			await markBuildAndReleaseAsFailed();

			const message = `There is a similar domain (${endpoint}) in "${namespaceOfExistingIngress}" namespace of "${context}" cluster, unable to create new ingress with the same domain. Suggestions:\n- Delete the ingress of this domain "${endpoint}" in "${namespaceOfExistingIngress}" namepsace.\n- Use a different domain for this deploy environment.`;
			sendLog({ SOCKET_ROOM, type: "error", action: "end", message });
			// dispatch/trigger webhook
			if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
			throw new Error(message);
		}
	} catch (e) {
		// update "deployStatus" in a build & a release
		await markBuildAndReleaseAsFailed();

		const message = `Unable to fetch ingresses of "${context}" cluster: ${e}`;
		sendLog({ SOCKET_ROOM, type: "error", action: "end", message });
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		throw new Error(message);
	}

	// Start rolling out new release
	/**
	 * ! [WARNING]
	 * ! If "--fresh" flag was specified, the deployment's namespace will be deleted & redeploy from scratch!
	 */
	// console.log("[DEPLOY BUILD] options.shouldUseFreshDeploy :>> ", options.shouldUseFreshDeploy);
	if (shouldUseFreshDeploy) {
		sendLog({
			SOCKET_ROOM,
			type: "warn",
			message: `[SYSTEM WARNING] Flag "--fresh" of CLI was specified by "${username}" while executed request deploy command, the build server's going to delete the "${namespace}" namespace (APP: ${appSlug} / PROJECT: ${projectSlug}) shortly...`,
		});

		const wipedNamespaceRes = await ClusterManager.deleteNamespaceByCluster(namespace, cluster.slug);
		if (isEmpty(wipedNamespaceRes)) {
			// update "deployStatus" in a build & a release
			await markBuildAndReleaseAsFailed();

			sendLog({
				SOCKET_ROOM,
				type: "error",
				message: `Unable to delete "${namespace}" namespace of "${cluster.slug}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
			});

			// dispatch/trigger webhook
			if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

			throw new Error(`Unable to delete "${namespace}" namespace of "${cluster.slug}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`);
		}

		sendLog({
			SOCKET_ROOM,
			message: `Successfully deleted "${namespace}" namespace of "${cluster.slug}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
		});
	}

	// NOTE: No need to "deployStatus" in a build & a release below, because there are similar code in "rolloutV2" function
	// await markBuildAndReleaseAsFailed();

	const onRolloutUpdate = (msg: string) => {
		// if any errors on rolling out -> stop processing deployment
		if (msg.indexOf("Error from server") > -1) {
			sendLog({ SOCKET_ROOM, type: "error", action: "end", message: msg });
			throw new Error(msg);
		} else {
			// if normal log message -> print out to the Web UI
			sendLog({ SOCKET_ROOM, message: msg });
		}
	};

	if (skipReadyCheck) {
		sendLog({
			SOCKET_ROOM,
			message:
				env === "prod"
					? `Rolling out the PRE-RELEASE deployment to "${env.toUpperCase()}" environment...`
					: `Rolling out the deployment to "${env.toUpperCase()}" environment...`,
		});

		try {
			ClusterManager.rolloutV2(releaseId, { onUpdate: onRolloutUpdate });
		} catch (e) {
			const errMsg = `Failed to roll out the release :>> ${e.message}:`;
			sendLog({ SOCKET_ROOM, type: "error", action: "end", message: errMsg });

			// dispatch/trigger webhook
			if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

			throw new Error(errMsg);
		}
	} else {
		if (release._id) {
			sendLog({
				SOCKET_ROOM,
				message: `Rolling out the deployment to "${env.toUpperCase()}" environment...`,
			});

			try {
				const result = await ClusterManager.rolloutV2(releaseId, { onUpdate: onRolloutUpdate });

				if (result.error) {
					const errMsg = `Failed to roll out the release :>> ${result.error}.`;
					sendLog({ SOCKET_ROOM, type: "error", message: errMsg, action: "end" });
					throw new Error(errMsg);
				}

				release = result.data;

				sendLog({ SOCKET_ROOM, message: `✅ App has been deployed successfully!`, type: "success", action: "end" });

				// dispatch/trigger webhook
				if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "success");
			} catch (e) {
				const errMsg = `Failed to roll out the release :>> ${e.message}`;
				sendLog({ SOCKET_ROOM, type: "error", action: "end", message: errMsg });

				// dispatch/trigger webhook
				if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

				throw new Error(errMsg);
			}
		}
	}
};

export const deployBuildV2 = async (build: IBuild, options: DeployBuildV2Options): Promise<DeployBuildV2Result> => {
	const { DB } = await import("@/modules/api/DB");

	// parse options
	const { env, port, owner, workspace, clusterSlug: targetClusterSlug, deployInBackground = true, cliVersion } = options;
	const { appSlug, projectSlug, tag: buildTag, num: buildNumber, registry: registryId } = build;
	const { slug: username } = owner;
	const SOCKET_ROOM = `${appSlug}-${buildTag}`;

	// build directory
	const SOURCE_CODE_DIR = `cache/${build.projectSlug}/${build.appSlug}/${build.branch}`;
	const buildDirectory = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE_DIR);

	// app info
	let app = await DB.updateOne("app", { slug: appSlug }, { updatedBy: owner._id }, { populate: ["project", "owner"] });
	if (!app) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `[DEPLOY BUILD] App "${appSlug}" not found.`,
		});
		throw new Error(`[DEPLOY BUILD] App "${appSlug}" not found.`);
	}

	// project info
	const project = app.project as IProject;
	const projectOwner = await DB.findOne("user", { _id: project.owner });
	const appOwner = app.owner as IUser;

	// app version
	const mainAppName = await getDeploymentName(app);
	const appVersion = `${mainAppName}-${buildNumber}`;

	// get deploy environment data
	let serverDeployEnvironment = await getDeployEvironmentByApp(app, env);
	let isPassedDeployEnvironmentValidation = true;
	const errMsgs: string[] = [];

	// generate 'namespace' if it's not exists
	if (!serverDeployEnvironment.namespace) {
		const namespace = `${projectSlug}-${env || "dev"}`;
		await updateAppConfig(app, env, { namespace });
		// reload app & deploy environment data...
		serverDeployEnvironment.namespace = namespace;
		app = await DB.findOne("app", { slug: appSlug }, { populate: ["project"] });
	}

	// validate deploy environment data...
	if (isEmpty(serverDeployEnvironment)) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `Deploy environment (${env.toUpperCase()}) of "${appSlug}" app is empty (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
		errMsgs.push(`Deploy environment (${env.toUpperCase()}) of "${appSlug}" app is empty (probably deleted?).`);
	}

	// if target cluster is defined, then set it to the deploy environment
	if (targetClusterSlug) serverDeployEnvironment.cluster = targetClusterSlug;

	// if no cluster is defined for this deploy environment, throw error
	if (!serverDeployEnvironment.cluster) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "cluster" name (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
		errMsgs.push(`Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "cluster" name (probably deleted?).`);
	}

	if (!isPassedDeployEnvironmentValidation) throw new Error(errMsgs.join(","));

	// find cluster
	const { cluster: clusterSlug } = serverDeployEnvironment;
	const cluster = await DB.findOne("cluster", { slug: clusterSlug });

	// find registry
	const registry = registryId ? await DB.findOne("registry", { _id: registryId }) : undefined;

	// get app config to generate deployment data
	const appConfig = getAppConfigFromApp(app);

	/**
	 * !!! IMPORTANT !!!
	 * Generate deployment data (YAML) & save the YAML deployment to "app.environment[env]"
	 * So it can be used to create release from build
	 */
	let deployment: GenerateDeploymentV2Result;
	sendLog({ SOCKET_ROOM, message: `[DEPLOY BUILD] Generating the deployment files on server...` });
	console.log("deployBuildV2() > generateDeploymentV2() > build.image :>> ", build.image);
	try {
		deployment = await generateDeploymentV2({
			appSlug,
			env,
			port,
			username,
			workspace,
			buildImage: build.image,
			buildTag,
			appConfig,
			targetDirectory: buildDirectory,
			registry,
		});
	} catch (e) {
		const errMsg = `[DEPLOY_BUILD] Generate YAML > error :>>\n${e.stack}`;

		// save log to database
		const { SystemLogService } = await import("@/services");
		const logSvc = new SystemLogService({ owner, workspace });
		logSvc.saveError(e, { name: "deploy-build" });

		console.error(errMsg);
		sendLog({ SOCKET_ROOM, type: "error", message: errMsg, action: "end" });
		throw new Error(errMsg);
	}
	const { endpoint, deploymentContent, deployEnvironment, deploymentName } = deployment;

	// update data to deploy environment:
	serverDeployEnvironment = { ...serverDeployEnvironment, ...deployEnvironment };
	serverDeployEnvironment.deploymentYaml = deploymentContent;
	serverDeployEnvironment.deploymentName = deploymentName;
	serverDeployEnvironment.updatedAt = new Date();
	serverDeployEnvironment.lastUpdatedBy = username;

	// Update {user}, {project}, {environment} to database before rolling out
	const updatedAppData = { deployEnvironment: app.deployEnvironment || {} } as IApp;
	updatedAppData.lastUpdatedBy = username;
	updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

	const updatedApp = await DB.updateOne("app", { slug: appSlug }, updatedAppData);
	// console.log("updatedApp.deployEnvironment[env].envVars :>> ", updatedApp.deployEnvironment[env].envVars);

	sendLog({ SOCKET_ROOM, message: `[DEPLOY BUILD] Generated the deployment files successfully!` });
	// log(`[BUILD] App's last updated by "${updatedApp.lastUpdatedBy}".`);

	// Create new Release:
	let releaseId: string, newRelease: IRelease;
	try {
		newRelease = await createReleaseFromBuild(build, env, { author: owner, workspace, cliVersion, appVersion });
		releaseId = MongoDB.toString(newRelease._id);

		sendLog({ SOCKET_ROOM, message: `✓ Created new release "${SOCKET_ROOM}" (ID: ${releaseId}) on BUILD SERVER successfully.` });
	} catch (e) {
		console.error("Deploy build > error :>> ", e);
		sendLog({ SOCKET_ROOM, message: `${e.message}`, type: "error", action: "end" });
		throw new Error(e.message);
	}

	// create webhook
	let webhook: IWebhook;
	const webhookSvc = new WebhookService();
	webhookSvc.ownership = { owner, workspace };

	if (isServerMode) {
		const consumers = filterUniqueItems([projectOwner?._id, appOwner?._id, owner?._id])
			.filter((uid) => typeof uid !== "undefined")
			.map((uid) => MongoDB.toString(uid));
		// console.log("consumers :>> ", consumers);

		webhook = await webhookSvc.create({
			events: ["deploy_status"],
			channels: ["email"],
			consumers,
			workspace: MongoDB.toString(workspace._id),
			project: MongoDB.toString(build.project),
			app: MongoDB.toString(app._id),
			build: MongoDB.toString(build._id),
			release: releaseId,
		});
	}

	// update project "lastUpdatedBy"
	await DB.updateOne(
		"project",
		{ _id: project._id },
		{
			lastUpdatedBy: username,
			latestBuild: build._id,
		}
	).catch(console.error);

	// process deploy build to cluster
	if (deployInBackground) {
		processDeployBuildV2(build, newRelease, cluster, options)
			.then(() => {
				updateReleaseStatusById(releaseId, "success");
			})
			.catch((e) => {
				updateReleaseStatusById(releaseId, "failed");
			});
	} else {
		try {
			await processDeployBuildV2(build, newRelease, cluster, options);
			await updateReleaseStatusById(releaseId, "success");
		} catch (e) {
			await updateReleaseStatusById(releaseId, "failed");
		}
	}

	return { app: updatedApp, build, release: newRelease, deployment, endpoint };
};

export const deployWithBuildSlug = async (buildSlug: string, options: DeployBuildV2Options) => {
	const { DB } = await import("@/modules/api/DB");
	const build = await DB.findOne("build", { slug: buildSlug });
	if (!build) throw new Error(`[DEPLOY BUILD] Build slug "${buildSlug}" not found.`);

	return deployBuild(build, options);
};
