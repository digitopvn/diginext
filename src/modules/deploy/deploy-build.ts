import { isEmpty } from "lodash";

import type { IApp, IBuild, ICluster, IRelease, IUser, IWorkspace } from "@/entities";
import { MongoDB } from "@/plugins/mongodb";

import { DB } from "../api/DB";
import { getAppConfigFromApp } from "../apps/app-helper";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { createReleaseFromBuild, sendLog } from "../build";
import ClusterManager from "../k8s";
import { fetchDeploymentFromContent } from "./fetch-deployment";
import type { GenerateDeploymentResult } from "./generate-deployment";
import { generateDeployment } from "./generate-deployment";

export type DeployBuildOptions = {
	env: string;
	author: IUser;
	workspace: IWorkspace;
	buildDirectory: string;
	cliVersion?: string;
	shouldUseFreshDeploy?: boolean;
	/**
	 * ### FOR DEPLOY to PROD
	 * Force roll out the release to "prod" deploy environment (instead of "prerelease" environment)
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
};

export const deployBuild = async (build: IBuild, options: DeployBuildOptions) => {
	const {
		env,
		author,
		workspace,
		buildDirectory,
		cliVersion,
		shouldUseFreshDeploy = false,
		skipReadyCheck = false,
		forceRollOut = false,
	} = options;
	const { appSlug, projectSlug, tag: buildNumber } = build;
	const { slug: username } = author;
	const SOCKET_ROOM = `${appSlug}-${buildNumber}`;

	const app = await DB.findOne<IApp>("app", { slug: appSlug }, { populate: ["project"] });
	if (!app) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `[DEPLOY BUILD] App "${appSlug}" not found.`,
		});
		return;
	}

	let serverDeployEnvironment = await getDeployEvironmentByApp(app, env);
	let isPassedDeployEnvironmentValidation = true;

	// validating...
	if (isEmpty(serverDeployEnvironment)) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `[START BUILD] Deploy environment (${env.toUpperCase()}) of "${appSlug}" app is empty (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (!serverDeployEnvironment.cluster) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `[START BUILD] Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "cluster" name (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (!serverDeployEnvironment.namespace) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `[START BUILD] Deploy environment (${env.toUpperCase()}) of "${appSlug}" app doesn't contain "namespace" name (probably deleted?).`,
		});
		isPassedDeployEnvironmentValidation = false;
	}

	if (!isPassedDeployEnvironmentValidation) return;

	const { namespace, cluster: clusterShortName } = serverDeployEnvironment;

	const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
	const { contextName: context } = cluster;

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
	const updatedAppData = { deployEnvironment: app.deployEnvironment || {} } as IApp;
	updatedAppData.lastUpdatedBy = username;
	updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

	const [updatedApp] = await DB.update<IApp>("app", { slug: appSlug }, updatedAppData);

	sendLog({ SOCKET_ROOM, message: `[START BUILD] Generated the deployment files successfully!` });
	// log(`[BUILD] App's last updated by "${updatedApp.lastUpdatedBy}".`);

	// Create new Release:
	let prereleaseDeploymentData = fetchDeploymentFromContent(prereleaseDeploymentContent);
	let releaseId: string, newRelease: IRelease;
	try {
		newRelease = await createReleaseFromBuild(build, env, { author });
		releaseId = MongoDB.toString(newRelease._id);
		console.log("Created new Release successfully:", newRelease);

		sendLog({ SOCKET_ROOM, message: `✓ Created new release "${SOCKET_ROOM}" (ID: ${releaseId}) on BUILD SERVER successfully.` });
	} catch (e) {
		console.log("e :>> ", e);
		sendLog({ SOCKET_ROOM, message: `${e.message}`, type: "error" });
		return;
	}

	/**
	 * Create namespace & imagePullScrets here!
	 * Because it will generate the name of secret to put into deployment yaml
	 */
	const isNsExisted = await ClusterManager.isNamespaceExisted(serverDeployEnvironment.namespace, { context });
	if (!isNsExisted) {
		const createNsResult = await ClusterManager.createNamespace(serverDeployEnvironment.namespace, { context });
		if (!createNsResult) return;
	}

	try {
		await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, serverDeployEnvironment.cluster, serverDeployEnvironment.namespace);
	} catch (e) {
		sendLog({
			SOCKET_ROOM,
			type: "error",
			message: `[PREVIEW] Can't create "imagePullSecrets" in the "${namespace}" namespace.`,
		});
		return;
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

		const wipedNamespaceRes = await ClusterManager.deleteNamespaceByCluster(namespace, serverDeployEnvironment.cluster);
		if (isEmpty(wipedNamespaceRes)) {
			sendLog({
				SOCKET_ROOM,
				type: "error",
				message: `Unable to delete "${namespace}" namespace of "${serverDeployEnvironment.cluster}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
			});
			return;
		}

		sendLog({
			SOCKET_ROOM,
			message: `Successfully deleted "${namespace}" namespace of "${serverDeployEnvironment.cluster}" cluster (APP: ${appSlug} / PROJECT: ${projectSlug}).`,
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
					ClusterManager.previewPrerelease(releaseId);
				} else {
					ClusterManager.rollout(releaseId);
				}
			}
		} catch (e) {
			sendLog({ SOCKET_ROOM, type: "error", message: `Failed to roll out the release :>> ${e.message}:` });
			return;
		}
	} else {
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
						? forceRollOut
							? await ClusterManager.rollout(releaseId, { onUpdate: onRolloutUpdate })
							: await ClusterManager.previewPrerelease(releaseId, { onUpdate: onRolloutUpdate })
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
	}

	return { build, release: newRelease, deployment };
};

export const deployWithBuildSlug = async (buildSlug: string, options: DeployBuildOptions) => {
	const build = await DB.findOne<IBuild>("build", { slug: buildSlug });
	if (!build) throw new Error(`[DEPLOY BUILD] Build slug "${buildSlug}" not found.`);

	return deployBuild(build, options);
};
