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
import { waitUntil } from "@/plugins";
import { isValidObjectId, MongoDB } from "@/plugins/mongodb";
import { makeSlug } from "@/plugins/slug";
import { WebhookService } from "@/services";

import getDeploymentName from "./generate-deployment-name";

export interface RolloutOptions {
	isDebugging?: boolean;
	onUpdate?: (msg?: string) => void;
}

/**
 * Clean up namespace's resources by app version
 * @param cluster - Cluster
 * @param appVersion - App's version
 */
export async function cleanUpNamespace(cluster: ICluster, namespace: string, appVersion: string) {
	const { contextName: context } = cluster;

	// Clean up Prerelease YAML
	const cleanUpCommands = [];

	// Delete INGRESS to optimize cluster
	cleanUpCommands.push(
		ClusterManager.deleteIngressByFilter(namespace, {
			context,
			skipOnError: true,
			filterLabel: `app-version=${appVersion}`,
		})
	);

	// Delete Prerelease SERVICE to optimize cluster
	cleanUpCommands.push(ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `app-version=${appVersion}` }));

	// Clean up Prerelease Deployments
	cleanUpCommands.push(ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `app-version=${appVersion}` }));

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
 * Clean up PRERELEASE resources by ID or release data
 * @param idOrRelease - Release ID or {Release} data
 */
export async function cleanUpPrereleaseV2(idOrRelease: string | IRelease) {
	const { DB } = await import("@/modules/api/DB");
	let releaseData: IRelease;

	// validation
	releaseData = await DB.findOne(
		"release",
		{ id: isValidObjectId(idOrRelease) ? idOrRelease : (idOrRelease as IRelease)._id },
		{
			select: ["_id", "id", "slug", "workspace", "owner", "cluster", "appSlug", "projectSlug", "namespace"],
			populate: ["workspace", "owner"],
		}
	);

	if (!releaseData) throw new Error(`Release "${idOrRelease}" not found.`);

	const { cluster: clusterSlug, appSlug, namespace, owner, workspace } = releaseData;

	let cluster: ICluster;
	// authenticate cluster's provider & switch kubectl to that cluster:
	try {
		cluster = await ClusterManager.authClusterBySlug(clusterSlug, { ownership: { owner: owner as IUser, workspace: workspace as IWorkspace } });
	} catch (e) {
		logError(`[KUBE_DEPLOY] Clean up > `, e);
		return { error: e.message };
	}
	const { contextName: context } = cluster;

	// Fallback support to the deprecated "main-app" name
	const app = await DB.findOne("app", { slug: appSlug }, { populate: ["project"] });
	const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();
	const mainAppName = await getDeploymentName(app);

	// Clean up Prerelease YAML
	const cleanUpCommands = [];

	// Delete INGRESS to optimize cluster
	cleanUpCommands.push(
		ClusterManager.deleteIngressByFilter(namespace, {
			context,
			skipOnError: true,
			filterLabel: `phase=prerelease,main-app=${mainAppName}`,
		})
	);

	// Delete Prerelease SERVICE to optimize cluster
	cleanUpCommands.push(ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `phase=prerelease,main-app=${mainAppName}` }));

	// Clean up Prerelease Deployments
	cleanUpCommands.push(ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `phase=prerelease,main-app=${mainAppName}` }));

	// ! --- fallback support deprecated app name ---
	// Delete INGRESS (fallback support deprecated app name)
	if (deprecatedMainAppName)
		cleanUpCommands.push(
			ClusterManager.deleteIngressByFilter(namespace, {
				context,
				skipOnError: true,
				filterLabel: `phase=prerelease,main-app=${deprecatedMainAppName}`,
			})
		);

	// ! --- fallback support deprecated app name ---
	// Delete Prerelease SERVICE to optimize cluster (fallback support deprecated app name)
	if (deprecatedMainAppName)
		cleanUpCommands.push(
			ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `phase=prerelease,main-app=${deprecatedMainAppName}` })
		);

	// ! --- fallback support deprecated app name ---
	// Clean up Prerelease Deployments
	if (deprecatedMainAppName)
		cleanUpCommands.push(
			ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `phase=prerelease,main-app=${deprecatedMainAppName}` })
		);

	// Clean up immediately & just ignore if any errors
	for (const cmd of cleanUpCommands) {
		try {
			await cmd;
		} catch (e) {
			logWarn(`[CLEAN UP] Ignore command: ${e}`);
		}
	}

	// * Print success:
	let msg = `🎉  PRERELEASE DEPLOYMENT DELETED  🎉`;
	logSuccess(msg);

	return { error: null, data: releaseData };
}

/**
 * Roll out a release (V2)
 * @param releaseId - Release ID
 */
export async function rolloutV2(releaseId: string, options: RolloutOptions = {}) {
	const { DB } = await import("@/modules/api/DB");
	const { onUpdate } = options;
	const { execa, execaCommand } = await import("execa");

	let releaseData = await DB.findOne("release", { id: releaseId }, { populate: ["owner", "workspace"] });
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
		build,
		buildNumber,
		preYaml: prereleaseYaml,
		deploymentYaml,
		endpoint: endpointUrl,
		namespace,
		env,
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
		return { error };
	}
	// log(`Rolling out > app:`, app);

	const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();
	const mainAppName = await getDeploymentName(app);
	/**
	 * App's tag (for service & deployment selector)
	 */
	const appVersion = `${mainAppName}-${buildNumber}`;

	// log(`Rolling out > mainAppName:`, mainAppName);

	// authenticate cluster's provider & switch kubectl to that cluster:
	const cluster = await DB.findOne("cluster", { slug: clusterSlug });
	if (!cluster) {
		logError(`Cluster "${clusterSlug}" not found.`);
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
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
		return { error };
	}

	/**
	 * Start applying new deployment YAML
	 */
	if (options?.isDebugging) console.log("[ROLL OUT V2] Deployment YAML :>> ", deploymentYaml);

	let replicas = 1,
		envVars: KubeEnvironmentVariable[] = [],
		resourceQuota: IResourceQuota = {},
		service: KubeService,
		svcName,
		ingress: KubeIngress,
		ingressName,
		deployment,
		deploymentName;

	yaml.loadAll(deploymentYaml, (doc: any) => {
		if (doc && doc.kind == "Ingress") {
			ingress = doc;
			ingressName = doc.metadata.name;
		}

		if (doc && doc.kind == "Service") {
			service = doc;
			svcName = doc.metadata.name;
		}

		if (doc && doc.kind == "Deployment") {
			replicas = doc.spec.replicas;
			envVars = doc.spec.template.spec.containers[0].env;
			resourceQuota = doc.spec.template.spec.containers[0].resources;
			deployment = doc;
			deploymentName = doc.metadata.name;
		}
	});

	// check ingress domain has been used yet or not:
	let isDomainUsed = false,
		usedDomain: string,
		deleteIng: KubeIngress;

	if (ingress) {
		const domains = ingress.spec.rules.map((rule) => rule.host) || [];
		// console.log("domains :>> ", domains);

		if (domains.length > 0) {
			const allIngresses = await ClusterManager.getAllIngresses({ context });

			allIngresses.filter((ing) => {
				domains.map((domain) => {
					if (ing.spec.rules.map((rule) => rule.host).includes(domain)) {
						isDomainUsed = true;
						usedDomain = domain;
						deleteIng = ing;
					}
				});
			});
			if (isDomainUsed) {
				await ClusterManager.deleteIngress(deleteIng.metadata.name, deleteIng.metadata.namespace, { context });

				if (onUpdate)
					onUpdate(
						`Domain "${usedDomain}" has been used before at "${deleteIng.metadata.namespace}" namespace -> Deleted "${deleteIng.metadata.name}" ingress to create a new one.`
					);
			}
		}
	}

	/**
	 * Apply new deployment yaml
	 */
	const applyDeploymentYamlRes = await ClusterManager.kubectlApplyContent(deploymentYaml, { context });
	if (!applyDeploymentYamlRes) {
		const error = `Unable to apply SERVICE "${service.metadata.name}" (Cluster: ${clusterSlug} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env}):\n${deploymentYaml}`;
		if (onUpdate) onUpdate(error);

		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		return { error };
	}

	if (onUpdate) onUpdate(`Applied new deployment YAML of "${appSlug}".`);

	// Wait until the deployment is ready!
	let notReadyCount = 0;
	const isNewDeploymentReady = async () => {
		const newPods = await ClusterManager.getPods(namespace, {
			context,
			filterLabel: `app=${mainAppName},app-version=${appVersion}`,
			metrics: false,
		});
		if (!newPods || newPods.length == 0) {
			const msg = `Something's wrong, new pods hasn't been created.`;
			onUpdate(msg);
			return false;
		}

		let isReady = false;
		newPods.forEach((pod) => {
			log(
				`[ROLL OUT V2] "${appVersion}" > ${pod.metadata.name} > pod.status.conditions :>>`,
				pod.status.conditions.map((c) => `\n- ${c.type}: ${c.status} (Reason: "${c.reason}")`).join("")
			);
			if (onUpdate) {
				pod.status?.conditions?.map((condition) => {
					// const msg = `[CHECKING NEW DEPLOYMENT STATUS] Type: "${condition.type}" -> Status: "${condition.status}"`;
					// onUpdate(msg);

					isReady = condition.type === "Ready" && condition.status === "True";

					if (condition.type === "ContainersReady" && condition.status === "False" && condition.reason === "ContainersNotReady") {
						if (notReadyCount >= 5) throw new Error(`App is unable to start up: ${condition.message}`);
						notReadyCount++;
					}
				});
			}
		});

		if (options?.isDebugging) log(`[ROLL OUT V2 - INTERVAL] Checking new pod's status -> Is Ready:`, isReady);
		return isReady;
	};

	const isReallyReady = await waitUntil(isNewDeploymentReady, 10, 4 * 60);
	if (options?.isDebugging) log(`[ROLL OUT V2] Checking new deployment's status -> Is Fully Ready:`, isReallyReady);

	// Try to get the container logs and print to the web ui
	let containerLogs = await logPodByFilter(namespace, { filterLabel: `app-version=${appVersion}`, context });
	if (!containerLogs)
		containerLogs += "\n\n-----\n\n" + (await logPodByFilter(namespace, { filterLabel: `app-version=${appVersion}`, previous: true, context }));

	if (onUpdate && containerLogs) onUpdate(`--------------- APP'S LOGS ON STARTED UP --------------- \n${containerLogs}`);

	// throw the error
	if (
		!isReallyReady ||
		containerLogs.indexOf("Error from server") > -1 ||
		containerLogs.indexOf("An error occurred") > -1 ||
		containerLogs.indexOf("Command failed") > -1
	) {
		const error = `[ERROR] The application failed to start up properly. To identify the issue, please review the application logs.`;
		if (onUpdate) onUpdate(error);

		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		return { error };
	}

	// Print success:
	const prodUrlInCLI = chalk.bold(`https://${endpointUrl}`);
	const successMsg = `🎉 PUBLISHED AT: ${prodUrlInCLI} 🎉`;
	logSuccess(successMsg);

	if (onUpdate) onUpdate(successMsg);

	// Mark previous releases as "inactive":
	await DB.update("release", { appSlug, active: true }, { active: false }, { select: ["_id", "active", "appSlug"] });

	// Mark this latest release as "active":
	const latestRelease = await DB.updateOne("release", { _id: releaseId }, { active: true }, { select: ["_id", "active", "appSlug"] });
	if (!latestRelease) {
		const error = `[ERROR] Unable to mark the latest release (${releaseId}) status as "active".`;
		if (onUpdate) onUpdate(error);
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		throw new Error(error);
	}

	// Assign this release as "latestRelease" of this app's deploy environment
	await DB.updateOne("app", { slug: appSlug }, { [`deployEnvironment.${env}.latestRelease`]: latestRelease._id }, { select: ["_id"] });

	/**
	 * 5. Clean up > Delete old deployments (IF ANY)
	 * - Skip CLEAN UP task on test environment
	 */
	if (!IsTest()) {
		/**
		 * [ONLY WHEN DEPLOY TO PRODUCTION ENVIRONMENT] Clean up prerelease deployments (to optimize cluster resource quotas)
		 */
		if (isServerMode && env === "prod") {
			cleanUpNamespace(cluster, namespace, appVersion)
				.then(({ error }) => {
					if (error) throw new Error(`Unable to clean up old resources in "${namespace}" namespace.`);
					logSuccess(`✅ Clean up old resources in "${namespace}" namespace SUCCESSFULLY.`);
				})
				.catch((e) => logError(`Unable to clean up old resources in "${namespace}" namespace:`, e));
		}
	}

	return { error: null, data: releaseData };
}
