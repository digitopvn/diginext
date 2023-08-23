import chalk from "chalk";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import { existsSync, mkdirSync } from "fs";
import yaml from "js-yaml";
import { isArray, isEmpty } from "lodash";
import path from "path";

import { isServerMode, IsTest } from "@/app.config";
import { cliOpts } from "@/config/config";
import { CLI_DIR } from "@/config/const";
import type { ICluster, IRelease, IUser, IWorkspace } from "@/entities";
import type { IResourceQuota, KubeIngress, KubeService } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import { objectToDeploymentYaml, wait, waitUntil } from "@/plugins";
import { isValidObjectId, MongoDB } from "@/plugins/mongodb";
import { makeSlug } from "@/plugins/slug";
import { WebhookService } from "@/services";

import getDeploymentName from "../deploy/generate-deployment-name";
import ClusterManager from "./index";
import { logPodByFilter } from "./kubectl";

export interface RolloutOptions {
	isDebugging?: boolean;
	onUpdate?: (msg?: string) => void;
}

/**
 * Clean up PRERELEASE resources by ID or release data
 * @param idOrRelease - Release ID or {Release} data
 */
export async function cleanUp(idOrRelease: string | IRelease) {
	const { DB } = await import("@/modules/api/DB");
	let releaseData: IRelease;

	// validation
	if (isValidObjectId(idOrRelease)) {
		releaseData = await DB.findOne(
			"release",
			{ id: idOrRelease },
			{ select: ["_id", "id", "slug", "workspace", "owner", "cluster", "appSlug", "projectSlug", "namespace"] }
		);

		if (!releaseData) throw new Error(`Release "${idOrRelease}" not found.`);
	} else {
		if (!(idOrRelease as IRelease).appSlug) throw new Error(`Release "${idOrRelease}" is invalid.`);
		releaseData = idOrRelease as IRelease;
	}

	const { cluster: clusterSlug, appSlug, namespace } = releaseData;

	let cluster: ICluster;
	// authenticate cluster's provider & switch kubectl to that cluster:
	try {
		cluster = await ClusterManager.authClusterBySlug(clusterSlug);
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
 * Roll out a prerelease environment
 * @param  {String} id - Release ID
 */
export async function previewPrerelease(id: string, options: RolloutOptions = {}) {
	const { DB } = await import("@/modules/api/DB");
	const { onUpdate } = options;

	let releaseData = await DB.findOne(
		"release",
		{ id },
		{
			populate: ["owner", "workspace"],
			select: [
				"_id",
				"id",
				"slug",
				"workspace",
				"owner",
				"cluster",
				"appSlug",
				"projectSlug",
				"namespace",
				"preYaml",
				"prereleaseUrl",
				"env",
				"build",
			],
		}
	);
	const owner = releaseData.owner as IUser;
	const workspace = releaseData.workspace as IWorkspace;

	// webhook
	const webhookSvc = new WebhookService();
	webhookSvc.ownership = { owner, workspace };
	const webhook = await DB.findOne("webhook", { release: id });

	if (isEmpty(releaseData)) {
		const error = `Unable to roll out to PRE-RELEASE environment: Release not found.`;
		if (onUpdate) onUpdate(error);
		return { error };
	}

	const { slug: releaseSlug, cluster: clusterSlug, appSlug, projectSlug, preYaml, prereleaseUrl, namespace, env } = releaseData;

	const app = await DB.findOne("app", { slug: appSlug }, { populate: ["project"] });
	const mainAppName = await getDeploymentName(app);

	log(`Preview the release: "${releaseSlug}" (${id})...`);
	if (onUpdate) onUpdate(`Rolling out to PRE-RELEASE environment: Release "${releaseSlug}" (${id})...`);

	let cluster: ICluster;
	// authenticate cluster's provider & switch kubectl to that cluster:
	try {
		cluster = await ClusterManager.authClusterBySlug(clusterSlug);
	} catch (e) {
		const error = `Unable to roll out app to PRE-RELEASE environment: ${e}`;
		logError(error);

		if (onUpdate) onUpdate(error);

		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		return { error };
	}
	const { contextName: context } = cluster;
	if (!context) {
		const error = `Unable to roll out app to PRE-RELEASE environment: Cluster context not found.`;
		if (onUpdate) onUpdate(error);
		throw new Error(error);
	}

	/**
	 * Check if there is any prod namespace, if not -> create one
	 */
	const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
	if (!isNsExisted) {
		log(`[KUBE_DEPLOY] Namespace "${namespace}" not found, creating one...`);
		const createNsRes = await ClusterManager.createNamespace(namespace, { context });
		if (!createNsRes) {
			const errMsg = `Unable to create new namespace: ${namespace} (Cluster: ${clusterSlug} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env})`;
			logError(errMsg);

			// dispatch/trigger webhook
			if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

			return { error: errMsg };
		}
	}

	/**
	 * Create "imagePullSecrets" in a namespace
	 */
	try {
		const { name: imagePullSecretName } = await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, clusterSlug, namespace);
		if (onUpdate)
			onUpdate(`[PREVIEW] Created "${imagePullSecretName}" imagePullSecrets in the "${namespace}" namespace (cluster: "${clusterSlug}").`);
	} catch (e) {
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		const error = `[PREVIEW] Can't create "imagePullSecrets" in the "${namespace}" namespace (cluster: "${clusterSlug}").`;
		if (onUpdate) onUpdate(error);
		throw new Error(error);
	}

	/**
	 * Delete current PRE-RELEASE deployments
	 */
	const curPrereleaseDeployments = await ClusterManager.getDeploysByFilter(namespace, {
		context,
		filterLabel: `phase=prerelease,main-app=${mainAppName}`,
	});
	if (!isEmpty(curPrereleaseDeployments)) {
		await ClusterManager.deleteDeploymentsByFilter(namespace, {
			context,
			filterLabel: `phase=prerelease,main-app=${mainAppName}`,
		});
	}

	/**
	 * Apply PRE-RELEASE deployment YAML
	 */
	const prereleaseDeploymentRes = await ClusterManager.kubectlApplyContent(preYaml, { context });
	if (!prereleaseDeploymentRes) {
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		const error = `Can't preview the pre-release "${id}" (Cluster: ${clusterSlug} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env}):\n${preYaml}`;
		if (onUpdate) onUpdate(error);
		throw new Error(error);
	}

	logSuccess(`The PRE-RELEASE environment is ready to preview: https://${prereleaseUrl}`);

	return { error: null, data: releaseData };
}

/**
 * Roll out a release
 * @param id - Release ID
 */
export async function rollout(id: string, options: RolloutOptions = {}) {
	const { DB } = await import("@/modules/api/DB");
	const { onUpdate } = options;
	const { execa, execaCommand } = await import("execa");

	let releaseData = await DB.findOne("release", { id }, { populate: ["owner", "workspace"] });
	if (isEmpty(releaseData)) {
		const error = `Unable to roll out: Release "${id}" not found.`;
		if (onUpdate) onUpdate(error);
		return { error };
	}

	const {
		slug: releaseSlug,
		projectSlug, // ! This is not PROJECT_ID of Google Cloud provider
		cluster: clusterSlug,
		appSlug,
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

	const webhook = await DB.findOne("webhook", { release: id });

	// log(`Rolling out the release: "${releaseSlug}" (ID: ${id})`);
	if (onUpdate) onUpdate(`Rolling out the release: "${releaseSlug}" (ID: ${id})`);

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
		await ClusterManager.authCluster(cluster);
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
			onUpdate(`[ROLL OUT] Created "${imagePullSecretName}" imagePullSecrets in the "${namespace}" namespace (cluster: "${clusterSlug}").`);
	} catch (e) {
		const error = `[ROLL OUT] Can't create "imagePullSecrets" in the "${namespace}" namespace (cluster: "${clusterSlug}").`;
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		return { error };
	}

	/**
	 * 1. Create SERVICE & INGRESS
	 */
	if (options?.isDebugging) console.log("[ROLL OUT] Deployment YAML :>> ", deploymentYaml);

	let replicas = 1,
		envVars: KubeEnvironmentVariable[] = [],
		resourceQuota: IResourceQuota = {},
		service: KubeService,
		svcName,
		ingress: KubeIngress,
		ingressName,
		deployment,
		deploymentName;

	yaml.loadAll(deploymentYaml, (doc) => {
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
	// log(`3`, { appSlug, service, svcName, ingress, ingressName, deploymentName });

	// Always apply new service, since the PORT could be changed !!!
	const SVC_CONTENT = objectToDeploymentYaml(service);
	const applySvcRes = await ClusterManager.kubectlApplyContent(SVC_CONTENT, { context });
	if (!applySvcRes) {
		const error = `Unable to apply SERVICE "${service.metadata.name}" (Cluster: ${clusterSlug} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env}):\n${SVC_CONTENT}`;
		if (onUpdate) onUpdate(error);

		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		return { error };
	}

	if (onUpdate) onUpdate(`Created new service named "${appSlug}".`);

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

	// log(`5`);

	let prereleaseApp, prereleaseAppName;
	if (env === "prod") {
		yaml.loadAll(prereleaseYaml, function (doc) {
			if (doc && doc.kind == "Service") prereleaseAppName = doc.spec.selector.app;
			if (doc && doc.kind == "Deployment") prereleaseApp = doc;
		});

		if (!prereleaseAppName) {
			const error = `[ROLL OUT] PROD environment: "prereleaseAppName" is invalid.`;
			if (onUpdate) onUpdate(error);
			return { error };
		}
		// if (onUpdate) onUpdate(`prereleaseAppName = ${prereleaseAppName}`);
	}

	/**
	 * 2. Delete prerelease app if it contains "prerelease" (OLD WAY)
	 * and apply new app for production
	 */

	// TODO: Check crashed / failed deployments -> delete them!
	let oldDeploys = await ClusterManager.getDeploys(namespace, { context, filterLabel: `phase!=prerelease,main-app=${mainAppName}` });
	const deprecatedMainAppDeploys = await ClusterManager.getDeploys(namespace, {
		context,
		filterLabel: `phase!=prerelease,main-app=${deprecatedMainAppName}`,
	});
	if (deprecatedMainAppDeploys && deprecatedMainAppDeploys.length > 0) oldDeploys.push(...deprecatedMainAppDeploys);

	if (onUpdate && options?.isDebugging)
		onUpdate(`Current app deployments (to be deleted later on): ${oldDeploys.map((d) => d.metadata.name).join(",")}`);

	const createNewDeployment = async (appDoc) => {
		const newApp = appDoc;
		const newAppName = deploymentName;
		newApp.metadata.name = deploymentName;

		// labels
		newApp.metadata.labels.phase = "live"; // mark this app as "live" phase
		newApp.metadata.labels.project = projectSlug;
		newApp.metadata.labels.app = newAppName;
		newApp.metadata.labels["main-app"] = mainAppName;

		newApp.spec.template.metadata.labels.phase = "live";
		newApp.spec.template.metadata.labels.app = newAppName;
		newApp.spec.template.metadata.labels["main-app"] = mainAppName;

		// envs & quotas
		newApp.spec.template.spec.containers[0].env = envVars;
		newApp.spec.template.spec.containers[0].resources = resourceQuota;

		// selector
		newApp.spec.selector.matchLabels.app = newAppName;

		let APP_CONTENT = objectToDeploymentYaml(newApp);
		const appCreateResult = await ClusterManager.kubectlApplyContent(APP_CONTENT, { context });
		if (!appCreateResult) {
			throw new Error(
				`[ROLL OUT] Failed to apply APP DEPLOYMENT config to "${newAppName}" in "${namespace}" namespace of "${context}" context:\n${APP_CONTENT}`
			);
		}

		if (onUpdate) onUpdate(`Created new deployment "${newAppName}" successfully.`);

		return newApp;
	};

	if (deploymentName.indexOf("prerelease") > -1 || isEmpty(oldDeploys)) {
		// ! if "prerelease" was deployed in OLD WAY or there are no old deployments
		await createNewDeployment(deployment);
	} else {
		// ! if "prerelease" was deployed in NEW WAY -> add label "phase" = "live"
		try {
			const args = [
				`--context=${context}`,
				"patch",
				"deploy",
				deploymentName,
				"-n",
				namespace,
				"--patch",
				`'{ "metadata": { "labels": { "phase": "live" } } }'`,
			];
			await execa(`kubectl`, args, cliOpts);
			if (onUpdate) onUpdate(`Updated "${deploymentName}" deployment successfully.`);
		} catch (e) {
			// if (onUpdate) onUpdate(`Patched "${deploymentName}" deployment failure: ${e.message}`);
			await createNewDeployment(deployment);
		}
	}

	/**
	 * 3. [ONLY PROD DEPLOY] Update ENV variables to PRODUCTION values
	 */
	if (env === "prod" && !isEmpty(envVars)) {
		const setPreEnvVarRes = await ClusterManager.setEnvVar(envVars, prereleaseAppName, namespace, { context });
		if (setPreEnvVarRes) if (onUpdate) onUpdate(`Updated environment variables to "${prereleaseAppName}" deployment successfully.`);
	}

	// Wait until the deployment is ready!
	const isNewDeploymentReady = async () => {
		const newDeploys = await ClusterManager.getDeploys(namespace, { context, filterLabel: `phase=live,app=${deploymentName}`, metrics: false });
		// log(`${namespace} > ${deploymentName} > newDeploys :>>`, newDeploys);

		let isReady = false;
		newDeploys.forEach((deploy) => {
			log(`[ROLL OUT] ${deploymentName} > deploy.status.conditions :>>`, deploy.status.conditions);
			// log(`[ROLL OUT] deploy.status.replicas :>>`, deploy.status.replicas);
			// log(`[ROLL OUT] deploy.status.unavailableReplicas :>>`, deploy.status.unavailableReplicas);
			// log(`[ROLL OUT] deploy.status.readyReplicas :>>`, deploy.status.readyReplicas);

			if (onUpdate) {
				deploy.status?.conditions?.map((condition) => {
					// if (condition.type === "False") isReady = true;
					// if (condition.type.toLowerCase() === "progressing")
					const msg = `[DEPLOY:${condition.type.toUpperCase()}] - ${condition.reason} - ${condition.message}`;
					onUpdate(msg);

					if (condition.type.toLowerCase() === "replicafailure") throw new Error(msg);
				});
			}

			console.log(`[ROLL OUT] ${deploymentName} > deploy.status.readyReplicas :>> `, deploy.status.readyReplicas);
			console.log(`[ROLL OUT] ${deploymentName} > deploy.status.unavailableReplicas :>> `, deploy.status.unavailableReplicas);
			isReady = deploy.status.readyReplicas && deploy.status.readyReplicas >= 1;

			// if (deploy.status.unavailableReplicas && deploy.status.unavailableReplicas >= 1) {
			// 	isReady = false;
			// } else if (deploy.status.readyReplicas && deploy.status.readyReplicas >= 1) {
			// 	isReady = true;
			// }
		});

		if (options?.isDebugging) log(`[ROLL OUT - INTERVAL] Checking new deployment's status -> Is Ready:`, isReady);
		return isReady;
	};

	const isReallyReady = await waitUntil(isNewDeploymentReady, 10, 4 * 60);
	if (options?.isDebugging) log(`[ROLL OUT] Checking new deployment's status -> Is Fully Ready:`, isReallyReady);

	// TODO: check app's health instead of 15 seconds
	if (isReallyReady) {
		if (onUpdate) onUpdate(`App is being started up right now, please wait...`);
		// Wait another 15s to make sure app is not crashing...
		await wait(15 * 1000);
	}
	let isCrashed = false;
	const newDeploys = await ClusterManager.getDeploys(namespace, { context, filterLabel: `phase=live,app=${deploymentName}`, metrics: false });
	newDeploys.forEach((deploy) => {
		isCrashed = deploy.status.unavailableReplicas && deploy.status.unavailableReplicas >= 1;
	});

	// Try to get the container logs and print to the web ui
	let containerLogs = await logPodByFilter(namespace, { filterLabel: `app=${deploymentName}`, context });
	if (!containerLogs) containerLogs += "\n\n-----\n\n" + (await logPodByFilter(namespace, { filterLabel: `main-app=${mainAppName}`, context }));
	if (!containerLogs)
		containerLogs += "\n\n-----\n\n" + (await logPodByFilter(namespace, { filterLabel: `app=${deploymentName}`, previous: true, context }));
	if (!containerLogs)
		containerLogs += "\n\n-----\n\n" + (await logPodByFilter(namespace, { filterLabel: `main-app=${mainAppName}`, previous: true, context }));

	if (onUpdate && containerLogs) onUpdate(`--------------- APP'S LOGS ON STARTED UP --------------- \n${containerLogs}`);

	// throw the error
	if (
		!isReallyReady ||
		isCrashed ||
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

	/**
	 * 4. Update "selector" of PRODUCTION SERVICE to select PRERELEASE APP NAME
	 */
	try {
		await execa(
			`kubectl`,
			[
				`--context=${context}`,
				`patch`,
				"service",
				svcName,
				"-n",
				namespace,
				"--patch",
				`{ "spec": { "selector": { "app": "${deploymentName}" } } }`,
			],
			cliOpts
		);
		if (onUpdate && options?.isDebugging) onUpdate(`Patched "${svcName}" service successfully >> new deployment: ${deploymentName}`);
	} catch (e) {
		if (onUpdate && options?.isDebugging) onUpdate(`[WARNING] Unable to patched "${svcName}" service: ${e.message}`);
	}

	/**
	 * 5. Scale replicas to PRODUCTION config
	 */
	try {
		await execa("kubectl", [`--context=${context}`, "scale", `--replicas=${replicas}`, `deploy`, deploymentName, `-n`, namespace], cliOpts);
		if (onUpdate && options?.isDebugging) onUpdate(`Scaled "${deploymentName}" replicas to ${replicas} successfully`);
	} catch (e) {
		if (onUpdate && options?.isDebugging)
			onUpdate(`[WARNING] Unable to scale the replicas of "${deploymentName}" deployment to ${replicas}: ${e.message}`);
	}

	/**
	 * 6. Apply resource quotas
	 */
	if (resourceQuota && resourceQuota.limits && resourceQuota.requests) {
		const resourcesStr = `--limits=cpu=${resourceQuota.limits.cpu},memory=${resourceQuota.limits.memory} --requests=cpu=${resourceQuota.requests.cpu},memory=${resourceQuota.requests.memory}`;
		const resouceCommand = `kubectl set resources deployment/${deploymentName} ${resourcesStr} -n ${namespace}`;
		try {
			await execaCommand(resouceCommand);
			if (onUpdate && options?.isDebugging) onUpdate(`Applied resource quotas to ${deploymentName} successfully`);
		} catch (e) {
			if (onUpdate && options?.isDebugging) onUpdate(`[WARNING] Command failed: ${resouceCommand}`);
			if (onUpdate && options?.isDebugging) onUpdate(`[WARNING] Applied "resources" quotas failure: ${e.message}`);
		}
	}

	// ! ALWAYS Create new ingress
	const ING_CONTENT = objectToDeploymentYaml(ingress);
	const ingCreateResult = await ClusterManager.kubectlApplyContent(ING_CONTENT, { context });
	if (!ingCreateResult) {
		const error = `[ERROR] Invalid INGRESS YAML (${env.toUpperCase()}) to "${ingressName}" in "${namespace}" namespace of "${context}" context:\n${ING_CONTENT}`;

		if (onUpdate) onUpdate(error);

		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");

		throw new Error(error);
	}

	// Print success:
	const prodUrlInCLI = chalk.bold(`https://${endpointUrl}`);
	const successMsg = `🎉 PUBLISHED AT: ${prodUrlInCLI} 🎉`;
	logSuccess(successMsg);

	if (onUpdate) onUpdate(successMsg);

	// Mark previous releases as "inactive":
	await DB.update("release", { appSlug, active: true }, { active: false }, { select: ["_id", "active", "appSlug"] });

	// Mark this latest release as "active":
	const latestRelease = await DB.updateOne("release", { _id: id }, { active: true }, { select: ["_id", "active", "appSlug"] });
	if (!latestRelease) {
		const error = `[ERROR] Unable to mark the latest release (${id}) status as "active".`;
		if (onUpdate) onUpdate(error);
		// dispatch/trigger webhook
		if (webhook) webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
		throw new Error(error);
	}

	// Assign this release as "latestRelease" of this app's deploy environment
	await DB.updateOne("app", { slug: appSlug }, { [`deployEnvironment.${env}.latestRelease`]: latestRelease._id }, { select: ["_id"] });

	/**
	 * 5. Clean up > Delete old deployments
	 * - Skip CLEAN UP task on test environment
	 */
	if (!IsTest()) {
		if (isArray(oldDeploys) && oldDeploys.length > 0) {
			const waitTime = 2 * 60 * 1000;
			const oldDeploysCleanUpCommands = oldDeploys
				.filter((d) => d.metadata.name != deploymentName)
				.map((deploy) => {
					const deployName = deploy.metadata.name;
					return ClusterManager.deleteDeploy(deployName, namespace, { context });
				});

			if (isServerMode) {
				setTimeout(
					async function (_commands) {
						try {
							await Promise.all(_commands);
						} catch (e) {
							logWarn(e.toString());
						}
					},
					waitTime,
					oldDeploysCleanUpCommands
				);
			} else {
				try {
					await Promise.all(oldDeploysCleanUpCommands);
				} catch (e) {
					logWarn(e.toString());
				}
			}
		}

		/**
		 * [ONLY WHEN DEPLOY TO PRODUCTION ENVIRONMENT] Clean up prerelease deployments (to optimize cluster resource quotas)
		 */
		if (isServerMode && env === "prod") {
			cleanUp(releaseData)
				.then(({ error }) => {
					if (error) throw new Error(`Unable to clean up PRERELEASE of release id [${id}]`);
					logSuccess(`✅ Clean up PRERELEASE of release id [${id}] SUCCESSFULLY.`);
				})
				.catch((e) => logError(`Unable to clean up PRERELEASE of release id [${id}]:`, e));
		}
	}

	return { error: null, data: releaseData };
}
