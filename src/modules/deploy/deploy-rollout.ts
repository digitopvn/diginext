import chalk from "chalk";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import { existsSync, mkdirSync } from "fs";
import yaml from "js-yaml";
import { isEmpty } from "lodash";
import path from "path";

import { isServerMode, IsTest } from "@/app.config";
import { CLI_DIR } from "@/config/const";
import type { ICluster, IRelease, IUser, IWorkspace } from "@/entities";
import type { IResourceQuota, KubeIngress, KubeService } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import ClusterManager from "@/modules/k8s";
import { logPodByFilter } from "@/modules/k8s/kubectl";
import { objectToDeploymentYaml, waitUntil } from "@/plugins";
import { MongoDB } from "@/plugins/mongodb";
import { makeSlug } from "@/plugins/slug";
import { WebhookService } from "@/services";

import getDeploymentName from "./generate-deployment-name";
import { markReleaseAsActive } from "./mark-release-as-active";

export interface RolloutOptions {
	isDebugging?: boolean;
	onUpdate?: (msg?: string) => void;
}

export interface CheckDeploymentReadyOptions {
	/**
	 * Cluster's context (in ".kubeconfig")
	 */
	context?: string;
	namespace: string;
	appName: string;
	appVersion?: string;
	replicas?: number;
	onUpdate?: (msg?: string) => void;
	isDebugging?: boolean;
}

const deployReplicas = 2;

const checkDeploymentReady = async (options: CheckDeploymentReadyOptions) => {
	const { namespace, appName, appVersion, replicas = 1, onUpdate, isDebugging = false, context } = options;
	if (isDebugging) log(`checkDeploymentReady() :>>`, options);

	const filterLabel = `main-app=${appName}${appVersion ? `,app-version=${appVersion}` : ""}`;
	const pods = await ClusterManager.getPods(namespace, {
		context,
		filterLabel,
		metrics: false,
		isDebugging,
	});
	if (!pods || pods.length == 0) {
		const msg = `Unable to check "${appName}" deployment:\n- Namespace: ${namespace}\n- Context: ${context}\n- Reason: Selected pods not found: ${filterLabel}.`;
		if (onUpdate) onUpdate(msg);
		throw new Error(msg);
	}

	let isReady = false;
	let countReady = 0;

	// if (isDebugging) log(`[ROLL OUT V2] "${appVersion}" > checking ${pods.length} pods > pod.status.conditions:`);
	try {
		pods.forEach((pod) => {
			if (isDebugging) log(pod.status?.conditions?.map((c) => `- ${c.type}: ${c.status} (Reason: "${c.reason}")`).join("\n"));

			pod.status?.conditions
				?.filter((condition) => condition.type === "Ready")
				.map((condition) => {
					if (condition.status === "True") countReady++;
				});

			pod.status?.containerStatuses?.map((containerStatus) => {
				if (containerStatus.restartCount > 0) throw new Error(`App is unable to start up due to some unexpected errors.`);
			});
		});
	} catch (e) {
		if (onUpdate) onUpdate(e.message);
		throw new Error(e.message);
	}

	if (countReady >= replicas) isReady = true;

	// notify to the dashboard:
	const msg = `Checking is "${appName}" deployment ready (${countReady}/${replicas}): ${isReady}`;
	log(msg);
	if (onUpdate) onUpdate(msg);
	return isReady;
};

/**
 * Clean up namespace's resources by app version
 * @param cluster - Cluster
 * @param appVersion - App's version
 */
export async function cleanUpNamespace(cluster: ICluster, namespace: string, appName: string, appVersion: string) {
	const { contextName: context } = cluster;

	// Clean up Prerelease YAML
	const cleanUpCommands = [];

	// Delete INGRESS to optimize cluster
	cleanUpCommands.push(
		ClusterManager.deleteIngressByFilter(namespace, {
			context,
			skipOnError: true,
			filterLabel: `main-app=${appName},app-version!=${appVersion}`,
		})
	);

	// Delete Prerelease SERVICE to optimize cluster
	cleanUpCommands.push(ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `main-app=${appName},app-version!=${appVersion}` }));

	// Clean up Prerelease Deployments
	cleanUpCommands.push(
		ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `main-app=${appName},app-version!=${appVersion}` })
	);

	// Clean up immediately & just ignore if any errors
	let data;
	for (const cmd of cleanUpCommands) {
		try {
			data = await cmd;
		} catch (e) {
			logWarn(`[CLEAN UP] Ignore command: ${e}`);
		}
	}

	// * Print success:
	let msg = `🎉  NAMESPACE HAS BEEN CLEANED UP SUCCESSFULLY  🎉`;
	logSuccess(msg);

	return { error: null, data };
}

/**
 * Roll out a release (V2)
 * @param releaseId - Release ID
 */
export async function rolloutV2(releaseId: string, options: RolloutOptions = {}) {
	const { DB } = await import("@/modules/api/DB");
	const { onUpdate } = options;

	let releaseData = await DB.updateOne("release", { _id: releaseId }, { status: "in_progress" }, { populate: ["owner", "workspace"] });
	if (isEmpty(releaseData)) {
		const error = `Unable to roll out: Release "${releaseId}" not found.`;
		if (onUpdate) onUpdate(error);
		return { error };
	}

	const {
		slug: releaseSlug,
		projectSlug, // ! This is not PROJECT_ID of Google Cloud provider
		cluster: clusterSlug,
		appSlug,
		build: buildId,
		buildNumber,
		deploymentYaml,
		endpoint: endpointUrl,
		namespace,
		env,
		message,
	} = releaseData as IRelease;

	// webhook
	const owner = releaseData.owner as IUser;
	const workspace = releaseData.workspace as IWorkspace;

	const webhookSvc = new WebhookService();
	webhookSvc.ownership = { owner, workspace };

	const webhook = await DB.findOne("webhook", { release: releaseId });

	// log(`Rolling out the release: "${releaseSlug}" (ID: ${id})`);
	if (onUpdate) onUpdate(`Rolling out the release: "${releaseSlug}" (ID: ${releaseId})`);

	// get the app
	const app = await DB.findOne("app", { slug: appSlug }, { populate: ["project"] });
	if (!app && onUpdate) {
		const error = `Unable to roll out: app "${appSlug}" not found.`;
		onUpdate(error);

		// update release as "failed"
		await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
		// Update "deployStatus" of a build to success
		await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

		return { error };
	}
	// log(`Rolling out > app:`, app);

	const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();
	const mainAppName = await getDeploymentName(app);
	const deployEnvironment = app.deployEnvironment[env];

	/**
	 * App's version (for service & deployment selector)
	 */
	const appVersion = releaseData.appVersion || `${mainAppName}-${buildNumber}`;

	// log(`Rolling out > mainAppName:`, mainAppName);

	// authenticate cluster's provider & switch kubectl to that cluster:
	const cluster = await DB.findOne("cluster", { slug: clusterSlug }, { subpath: "/all" });
	if (!cluster) {
		logError(`Cluster "${clusterSlug}" not found.`);
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		// update release as "failed"
		await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
		// Update "deployStatus" of a build to success
		await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

		return { error: `Cluster "${clusterSlug}" not found.` };
	}

	try {
		await ClusterManager.authCluster(cluster, { ownership: { owner, workspace } });
		// log(`Rolling out > Checked connectivity of "${clusterSlug}" cluster.`);
	} catch (e) {
		const error = `Unable to authenticate the cluster: ${e.message}`;
		logError(`[ROLL_OUT] ${error}`);
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		// update release as "failed"
		await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
		// Update "deployStatus" of a build to success
		await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

		return { error };
	}

	const { contextName: context } = cluster;
	if (options?.isDebugging) log(`Rolling out > Connected to "${clusterSlug}" cluster.`);

	// create temporary directory to store release's yaml
	const tmpDir = path.resolve(CLI_DIR, `storage/releases/${releaseSlug}`);
	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

	// ! NEW WAY -> LESS DOWNTIME WHEN ROLLING OUT NEW DEPLOYMENT !

	/**
	 * Check if there is any prod namespace, if not -> create one
	 */
	const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
	if (!isNsExisted) {
		log(`Namespace "${namespace}" not found, creating one...`);
		if (onUpdate) onUpdate(`Namespace "${namespace}" not found, creating one...`);

		const createNsRes = await ClusterManager.createNamespace(namespace, { context });
		if (!createNsRes) {
			const err = `Unable to create new namespace: ${namespace} (Cluster: ${clusterSlug} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env})`;
			logError(`[ROLL_OUT]`, err);
			if (onUpdate) onUpdate(err);

			// dispatch/trigger webhook
			if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

			// update release as "failed"
			await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
			// Update "deployStatus" of a build to success
			await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

			return { error: err };
		}
	}

	// create "imagePullSecret" in namespace:
	try {
		const { name: imagePullSecretName } = await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, clusterSlug, namespace);
		if (onUpdate)
			onUpdate(`[ROLL OUT V2] Created "${imagePullSecretName}" imagePullSecrets in the "${namespace}" namespace (cluster: "${clusterSlug}").`);
	} catch (e) {
		const error = `[ROLL OUT V2] Can't create "imagePullSecrets" in the "${namespace}" namespace (cluster: "${clusterSlug}").`;
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		// update release as "failed"
		await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
		// Update "deployStatus" of a build to success
		await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);
		return { error };
	}

	/**
	 * Start applying new deployment YAML
	 */
	if (options?.isDebugging) console.log("[ROLL OUT V2] Deployment YAML :>> ", deploymentYaml);

	let newReplicas = 1,
		currentReplicas = 0,
		currentDeploymentName,
		currentAppVersion,
		envVars: KubeEnvironmentVariable[] = [],
		resourceQuota: IResourceQuota = {},
		service: KubeService,
		svcName,
		ingress: KubeIngress,
		ingressName,
		deployment,
		deploymentName;

	let deploymentCfg: any[] = yaml.loadAll(deploymentYaml);
	if (deploymentCfg.length > 1) {
		deploymentCfg.forEach((doc: any) => {
			if (doc && doc.kind == "Ingress") {
				ingress = doc;
				ingressName = doc.metadata.name;
			}

			if (doc && doc.kind == "Service") {
				service = doc;
				svcName = doc.metadata.name;
			}

			if (doc && doc.kind == "Deployment") {
				newReplicas = doc.spec.replicas;
				// important: set new deployment's replicas to "deployReplicas" for temporary -> set back later (avoid downtime)
				doc.spec.replicas = deployReplicas;
				//
				envVars = doc.spec.template.spec.containers[0].env;
				resourceQuota = doc.spec.template.spec.containers[0].resources;
				deployment = doc;
				deploymentName = doc.metadata.name;
			}
		});
	}
	const tmpDeploymentYaml = objectToDeploymentYaml(deploymentCfg);
	const [currentDeployment] = await ClusterManager.getDeploys(namespace, { context, filterLabel: `main-app=${mainAppName}`, metrics: false });
	currentReplicas = currentDeployment && typeof currentDeployment !== "string" ? currentDeployment.spec.replicas : 1;
	currentDeploymentName = currentDeployment && typeof currentDeployment !== "string" ? currentDeployment.metadata.name : "";
	currentAppVersion = currentDeployment && typeof currentDeployment !== "string" ? currentDeployment.metadata.labels["app-version"] : undefined;

	// check ingress domain has been used yet or not:
	let isDomainUsed = false,
		usedDomain: string,
		usedDomainNamespace: string,
		deleteIng: KubeIngress;

	if (ingress) {
		const domains = ingress.spec.rules.map((rule) => rule.host) || [];
		// console.log("domains :>> ", domains);

		if (domains.length > 0) {
			const allIngresses = await ClusterManager.getAllIngresses({ context });

			allIngresses.filter((ing) => {
				domains.map((domain) => {
					if (ing.spec.rules.map((rule) => rule.host).includes(domain) && ing.metadata.namespace !== namespace) {
						isDomainUsed = true;
						usedDomain = domain;
						deleteIng = ing;
						usedDomainNamespace = ing.metadata.namespace;
					}
				});
			});
			if (isDomainUsed) {
				// await ClusterManager.deleteIngress(deleteIng.metadata.name, deleteIng.metadata.namespace, { context });
				// if (onUpdate)
				// 	onUpdate(
				// 		`Domain "${usedDomain}" has been used before at "${deleteIng.metadata.namespace}" namespace -> Deleted "${deleteIng.metadata.name}" ingress to create a new one.`
				// 	);
				const error = `This domain "${service.metadata.name}" has been using in "${usedDomainNamespace}" namespace.`;
				if (onUpdate) onUpdate(error);

				// dispatch/trigger webhook
				if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

				// update release as "failed"
				await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
				// Update "deployStatus" of a build to success
				await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

				return { error };
			}
		}
	}

	/**
	 * Scale current deployment up to many replicas before apply new deployment YAML
	 */
	if (newReplicas === 1 || currentReplicas <= 1) {
		if (currentDeploymentName) {
			if (onUpdate) onUpdate(`Scaling "${currentDeploymentName}" deployment to ${deployReplicas} & prepare for rolling out new deployment.`);
			await ClusterManager.scaleDeploy(currentDeploymentName, deployReplicas, namespace, { context });

			// wait 10 secs
			// await wait(30 * 1000);
			// await ClusterManager.setDeployImageAll(deploymentName, `${deployEnvironment.imageURL}:${deployEnvironment.buildTag}`, namespace, { context });

			// wait until an old deployment has been scaled successfully
			const isDeploymentFinishScaling = await waitUntil(
				() =>
					checkDeploymentReady({
						context,
						appName: mainAppName,
						namespace,
						replicas: deployReplicas,
						onUpdate,
						// isDebugging: true,
					}),
				5,
				5 * 60
			).catch((e) => false);

			if (!isDeploymentFinishScaling) {
				logWarn(`Unable to scale up the previous deployment, downtime might happen.`);
				if (onUpdate)
					onUpdate(
						`Unable to scale up the previous deployment (${currentDeploymentName}) to ${deployReplicas} replicas, downtime might happen.`
					);
			} else {
				if (onUpdate) onUpdate(`Scaled "${currentDeploymentName}" deployment to ${deployReplicas} replicas successfully.`);
			}
		}
	}

	/**
	 * Apply new deployment yaml
	 */
	try {
		await ClusterManager.kubectlApplyContent(tmpDeploymentYaml, { context });
		if (onUpdate) onUpdate(`Applied new deployment YAML of "${appSlug}" successfully.`);
	} catch (e) {
		const error = `[ERROR] Unable to apply new deployment "${deploymentName}": ${e}\n\n${deploymentYaml}`;
		if (onUpdate) onUpdate(error);

		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		// update release as "failed"
		await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
		// Update "deployStatus" of a build to success
		await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

		return { error };
	}

	/**
	 * Annotate new deployment with app version
	 */
	try {
		await ClusterManager.kubectlAnnotateDeployment(`kubernetes.io/change-cause="${message || appVersion}"`, deploymentName, namespace, {
			context,
		});
	} catch (e) {
		const error = `Unable to annotate new deployment (Cluster: ${clusterSlug} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env} / Deployment: ${deploymentName})`;
		if (onUpdate) onUpdate(error);

		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		// update release as "failed"
		await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
		// Update "deployStatus" of a build to success
		await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

		return { error };
	}

	// Wait until the deployment is ready!

	// check interval: 10 secs
	// max wait time: 10 mins
	const isNewDeploymentReady = await waitUntil(
		() =>
			checkDeploymentReady({
				context,
				appName: mainAppName,
				appVersion,
				namespace,
				onUpdate,
				// isDebugging: true,
			}),
		5,
		10 * 60
	).catch((e) => false);
	if (options?.isDebugging) log(`[ROLL OUT V2] Checking new deployment's status -> Is Fully Ready:`, isNewDeploymentReady);

	// Try to get the container logs and print to the web ui
	let containerLogs = isNewDeploymentReady
		? await logPodByFilter(namespace, { filterLabel: `app-version=${appVersion}`, context }).catch((e) => "")
		: await logPodByFilter(namespace, { filterLabel: `app-version=${appVersion}`, previous: true, context }).catch((e) => "");

	if (onUpdate && containerLogs) onUpdate(`--------------- APP'S LOGS ON STARTED UP --------------- \n${containerLogs}`);

	// throw the error
	if (
		!isNewDeploymentReady ||
		containerLogs.indexOf("Error from server") > -1 ||
		containerLogs.indexOf("An error occurred") > -1 ||
		containerLogs.indexOf("Command failed") > -1 ||
		containerLogs.indexOf("Unexpected Server Error") > -1
	) {
		const error = `[ERROR] The application failed to start up properly. To identify the issue, please review the application logs.`;
		if (onUpdate) onUpdate(error);

		// print out the logs in server side:
		logError(containerLogs);

		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		// update release as "failed"
		await DB.update("release", { _id: releaseId }, { status: "failed" }, { select: ["_id", "status"] }).catch(console.error);
		// Update "deployStatus" of a build to success
		await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

		return { error };
	}

	// Scale new deployment to new replicas
	await ClusterManager.scaleDeploy(deploymentName, newReplicas, namespace, { context });

	// Print success:
	const prodUrlInCLI = chalk.bold(`https://${endpointUrl}`);
	const successMsg = `🎉 PUBLISHED AT: ${prodUrlInCLI} 🎉`;
	logSuccess(successMsg);

	if (onUpdate) onUpdate(successMsg);

	// Mark this latest release as "active":
	try {
		const latestRelease = await markReleaseAsActive({ id: releaseId, appSlug, env });
		if (!latestRelease) throw new Error(`Release "${releaseId}" not found.`);
	} catch (e) {
		const error = `[ERROR] Unable to mark the latest release (${releaseId}) status as "active": ${e.message}`;
		if (onUpdate) onUpdate(error);
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		// Update "deployStatus" of a build to "failed"
		await DB.update("build", { _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] });
		throw new Error(error);
	}

	// Update "deployStatus" of a build to success
	const build = await DB.updateOne("build", { _id: buildId }, { deployStatus: "success" }, { select: ["_id", "deployStatus"] });
	// Update project to sort by latest release
	await DB.update("project", { slug: projectSlug }, { lastUpdatedBy: owner.username, latestBuild: build?._id }, { select: ["_id", "updatedAt"] });

	// Assign this release as "latestRelease" of this app's deploy environment
	await DB.updateOne(
		"app",
		{ slug: appSlug },
		{
			[`deployEnvironment.${env}.latestRelease`]: releaseId,
			[`deployEnvironment.${env}.appVersion`]: appVersion,
			[`deployEnvironment.${env}.buildId`]: buildId,
		},
		{ select: ["_id"] }
	);

	/**
	 * 5. Clean up > Delete old deployments (IF ANY)
	 * - Skip CLEAN UP task on test environment
	 */
	if (!IsTest()) {
		/**
		 * NOTE: Clean up DEPRECATED deployments (from OLD CLI <3.33.11 deployments)
		 */
		// if (isServerMode && env === "prod") {
		if (isServerMode) {
			cleanUpNamespace(cluster, namespace, mainAppName, appVersion)
				.then(({ error }) => {
					if (error) throw new Error(`Unable to clean up old resources in "${namespace}" namespace.`);
					logSuccess(`✅ Clean up old resources in "${namespace}" namespace SUCCESSFULLY.`);
				})
				.catch((e) => logError(`Unable to clean up old resources in "${namespace}" namespace:`, e));
		}
	}

	return { error: null, data: releaseData };
}
