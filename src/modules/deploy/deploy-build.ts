import { isEmpty } from "lodash";
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
import ClusterManager from "../k8s";
import { fetchDeploymentFromContent } from "./fetch-deployment";
import type { GenerateDeploymentResult } from "./generate-deployment";
import { generateDeployment } from "./generate-deployment";

export type DeployBuildOptions = {
	/**
	 * ### `REQUIRED`
	 * Deploy environment
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

export const processDeployBuild = async (build: IBuild, release: IRelease, cluster: ICluster, options: DeployBuildOptions) => {
	const { env, owner, shouldUseFreshDeploy = false, skipReadyCheck = false, forceRollOut = false } = options;
	const { appSlug, projectSlug, tag: buildNumber } = build;
	const { slug: username } = owner;
	const SOCKET_ROOM = `${appSlug}-${buildNumber}`;
	const releaseId = MongoDB.toString(release._id);
	const { DB } = await import("@/modules/api/DB");
	const workspace = await DB.findOne("workspace", { _id: build.workspace });

	// webhook
	const webhookSvc = new WebhookService();
	webhookSvc.ownership = { owner, workspace };
	const webhook = await DB.findOne("webhook", { release: releaseId });

	// authenticate cluster & switch to that cluster's context
	try {
		await ClusterManager.authCluster(cluster);
		sendLog({ SOCKET_ROOM, message: `✓ Connected to "${cluster.name}" (context: ${cluster.contextName}).` });
	} catch (e) {
		console.log("e :>> ", e);
		sendLog({ SOCKET_ROOM, message: `${e.message}`, type: "error" });
		return { error: e.message };
	}

	// target environment info
	const { contextName: context } = cluster;
	const { namespace } = release;

	/**
	 * Create namespace & imagePullScrets here!
	 * Because it will generate the name of secret to put into deployment yaml
	 */
	const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
	if (!isNsExisted) {
		const createNsResult = await ClusterManager.createNamespace(namespace, { context });
		if (!createNsResult) return { error: `Unable to create new namespace: ${namespace}` };
	}

	try {
		const { name: imagePullSecretName } = await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, cluster.slug, namespace);
		sendLog({
			SOCKET_ROOM,
			message: `Created "${imagePullSecretName}" imagePullSecrets in the "${namespace}" namespace.`,
		});
	} catch (e) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `Can't create "imagePullSecrets" in the "${namespace}" namespace.`,
		});
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		return { error: `Can't create "imagePullSecrets" in the "${namespace}" namespace.` };
	}

	// Start rolling out new release
	/**
	 * ! [WARNING]
	 * ! If "--fresh" flag was specified, the deployment's namespace will be deleted & redeploy from scratch!
	 */
	// console.log("[START BUILD] options.shouldUseFreshDeploy :>> ", options.shouldUseFreshDeploy);
	if (shouldUseFreshDeploy) {
		sendLog({
			SOCKET_ROOM,
			type: "warn",
			message: `[SYSTEM WARNING] Flag "--fresh" of CLI was specified by "${username}" while executed request deploy command, the build server's going to delete the "${namespace}" namespace (APP: ${appSlug} / PROJECT: ${projectSlug}) shortly...`,
		});

		const wipedNamespaceRes = await ClusterManager.deleteNamespaceByCluster(namespace, cluster.slug);
		if (isEmpty(wipedNamespaceRes)) {
			sendLog({
				SOCKET_ROOM,
				type: "error",
				message: `Unable to delete "${namespace}" namespace of "${cluster.slug}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
			});

			// dispatch/trigger webhook
			if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

			return {
				error: `Unable to delete "${namespace}" namespace of "${cluster.slug}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
			};
		}

		sendLog({
			SOCKET_ROOM,
			message: `Successfully deleted "${namespace}" namespace of "${cluster.slug}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
		});
	}

	if (skipReadyCheck) {
		sendLog({
			SOCKET_ROOM,
			message:
				env === "prod"
					? `Rolling out the PRE-RELEASE deployment to "${env.toUpperCase()}" environment...`
					: `Rolling out the deployment to "${env.toUpperCase()}" environment...`,
		});

		try {
			if (forceRollOut) {
				ClusterManager.rollout(releaseId);
			} else {
				if (env === "prod") {
					ClusterManager.previewPrerelease(releaseId, {
						onUpdate: (msg) => {
							sendLog({ SOCKET_ROOM, message: msg });
						},
					});
				} else {
					ClusterManager.rollout(releaseId, {
						onUpdate: (msg) => {
							sendLog({ SOCKET_ROOM, message: msg });
						},
					});
				}
			}
		} catch (e) {
			sendLog({ SOCKET_ROOM, type: "error", message: `Failed to roll out the release :>> ${e.message}:` });

			// dispatch/trigger webhook
			if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

			return { error: `Failed to roll out the release :>> ${e.message}:` };
		}
	} else {
		if (release._id) {
			sendLog({
				SOCKET_ROOM,
				message:
					env === "prod"
						? `Rolling out the PRE-RELEASE deployment to "${env.toUpperCase()}" environment...`
						: `Rolling out the deployment to "${env.toUpperCase()}" environment...`,
			});

			try {
				const onRolloutUpdate = (msg: string) => {
					// if any errors on rolling out -> stop processing deployment
					if (msg.indexOf("Error from server") > -1) {
						sendLog({ SOCKET_ROOM, type: "error", message: msg });
						throw new Error(msg);
					} else {
						// if normal log message -> print out to the Web UI
						sendLog({ SOCKET_ROOM, message: msg });
					}
				};

				const result =
					env === "prod"
						? forceRollOut
							? await ClusterManager.rollout(releaseId, { onUpdate: onRolloutUpdate })
							: await ClusterManager.previewPrerelease(releaseId, { onUpdate: onRolloutUpdate })
						: await ClusterManager.rollout(releaseId, { onUpdate: onRolloutUpdate });

				if (result.error) {
					const errMsg = `Failed to roll out the release :>> ${result.error}.`;
					sendLog({ SOCKET_ROOM, type: "error", message: errMsg });
					return { error: errMsg };
				}

				release = result.data;

				// dispatch/trigger webhook
				if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "success");
			} catch (e) {
				sendLog({ SOCKET_ROOM, type: "error", message: `Failed to roll out the release :>> ${e.message}` });

				// dispatch/trigger webhook
				if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

				return { error: `Failed to roll out the release :>> ${e.message}` };
			}
		}
	}
};

export const deployBuild = async (build: IBuild, options: DeployBuildOptions) => {
	const { DB } = await import("@/modules/api/DB");

	// parse options
	const { env, owner, workspace, deployInBackground = true, cliVersion } = options;
	const { appSlug, projectSlug, tag: buildNumber } = build;
	const { slug: username } = owner;
	const SOCKET_ROOM = `${appSlug}-${buildNumber}`;

	// build directory
	const SOURCE_CODE_DIR = `cache/${build.projectSlug}/${build.appSlug}/${build.branch}`;
	const buildDirectory = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE_DIR);

	let app = await DB.updateOne("app", { slug: appSlug }, { updatedBy: owner._id }, { populate: ["project", "owner"] });
	if (!app) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `[DEPLOY BUILD] App "${appSlug}" not found.`,
		});
		return { error: `[DEPLOY BUILD] App "${appSlug}" not found.` };
	}

	const project = app.project as IProject;
	const projectOwner = await DB.findOne("user", { _id: project.owner });
	const appOwner = app.owner as IUser;

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

	if (!serverDeployEnvironment.cluster) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "cluster" name (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
		errMsgs.push(`Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "cluster" name (probably deleted?).`);
	}

	if (!isPassedDeployEnvironmentValidation) return { error: errMsgs.join(",") };

	// find cluster
	const { cluster: clusterSlug } = serverDeployEnvironment;
	const cluster = await DB.findOne("cluster", { slug: clusterSlug });

	// get app config to generate deployment data
	const appConfig = getAppConfigFromApp(app);

	/**
	 * !!! IMPORTANT !!!
	 * Generate deployment data (YAML) & save the YAML deployment to "app.environment[env]"
	 * So it can be used to create release from build
	 */
	let deployment: GenerateDeploymentResult;
	sendLog({ SOCKET_ROOM, message: `[START BUILD] Generating the deployment files on server...` });
	try {
		deployment = await generateDeployment({
			appSlug,
			env,
			username,
			workspace,
			buildNumber,
			appConfig,
			targetDirectory: buildDirectory,
		});
	} catch (e) {
		console.log("e :>> ", e);
		sendLog({ SOCKET_ROOM, type: "error", message: e.message });
		return { error: e.message };
	}
	const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = deployment;

	// update data to deploy environment:
	serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
	serverDeployEnvironment.deploymentYaml = deploymentContent;
	serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
	serverDeployEnvironment.updatedAt = new Date();
	serverDeployEnvironment.lastUpdatedBy = username;

	// Update {user}, {project}, {environment} to database before rolling out
	const updatedAppData = { deployEnvironment: app.deployEnvironment || {} } as IApp;
	updatedAppData.lastUpdatedBy = username;
	updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

	const updatedApp = await DB.updateOne("app", { slug: appSlug }, updatedAppData);

	sendLog({ SOCKET_ROOM, message: `[START BUILD] Generated the deployment files successfully!` });
	// log(`[BUILD] App's last updated by "${updatedApp.lastUpdatedBy}".`);

	// Create new Release:
	let prereleaseDeploymentData = fetchDeploymentFromContent(prereleaseDeploymentContent);
	let releaseId: string, newRelease: IRelease;
	try {
		newRelease = await createReleaseFromBuild(build, env, { author: owner, workspace, cliVersion });
		releaseId = MongoDB.toString(newRelease._id);
		console.log("Created new Release successfully:", newRelease);

		sendLog({ SOCKET_ROOM, message: `✓ Created new release "${SOCKET_ROOM}" (ID: ${releaseId}) on BUILD SERVER successfully.` });
	} catch (e) {
		console.log("e :>> ", e);
		sendLog({ SOCKET_ROOM, message: `${e.message}`, type: "error" });
		return { error: e.message };
	}

	// create webhook
	let webhook: IWebhook;
	const webhookSvc = new WebhookService();
	webhookSvc.ownership = { owner, workspace };

	if (isServerMode) {
		const consumers = filterUniqueItems([projectOwner?._id, appOwner?._id, owner?._id])
			.filter((uid) => typeof uid !== "undefined")
			.map((uid) => MongoDB.toString(uid));
		console.log("consumers :>> ", consumers);

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

	// process deploy build to cluster
	if (deployInBackground) {
		processDeployBuild(build, newRelease, cluster, options);
	} else {
		await processDeployBuild(build, newRelease, cluster, options);
	}

	return { app: updatedApp, build, release: newRelease, deployment, endpoint, prerelease: prereleaseDeploymentData };
};

export const deployWithBuildSlug = async (buildSlug: string, options: DeployBuildOptions) => {
	const { DB } = await import("@/modules/api/DB");
	const build = await DB.findOne("build", { slug: buildSlug });
	if (!build) throw new Error(`[DEPLOY BUILD] Build slug "${buildSlug}" not found.`);

	return deployBuild(build, options);
};
