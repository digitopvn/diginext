import chalk from "chalk";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import { existsSync, mkdirSync } from "fs";
import yaml from "js-yaml";
import { isArray, isEmpty } from "lodash";
import { ObjectId } from "mongodb";
import path from "path";

import { isServerMode } from "@/app.config";
import { cliOpts } from "@/config/config";
import { CLI_DIR } from "@/config/const";
import type { Cluster, Release } from "@/entities";
import type { IResourceQuota, KubeService } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import { execCmd, getValueOfKubeEnvVarsByName, objectToDeploymentYaml, waitUntil } from "@/plugins";
import { isValidObjectId } from "@/plugins/mongodb";

import { DB } from "../api/DB";
import ClusterManager from ".";

/**
 * Clean up PRERELEASE resources by ID or release data
 * @param idOrRelease - Release ID or {Release} data
 */
export async function cleanUp(idOrRelease: string | Release) {
	let releaseData: Release;

	// validation
	if (isValidObjectId(idOrRelease)) {
		let data = await DB.findOne<Release>("release", { id: idOrRelease });

		if (!data) {
			throw new Error(`Release "${idOrRelease}" not found.`);
		}
		releaseData = data as Release;
	} else {
		if (!(idOrRelease as Release).appSlug) {
			throw new Error(`Release "${idOrRelease}" is invalid.`);
		}
		releaseData = idOrRelease as Release;
	}

	const { slug: releaseSlug, cluster: clusterShortName, appSlug, preYaml, prereleaseUrl, namespace, env } = releaseData;

	let cluster: Cluster;
	// authenticate cluster's provider & switch kubectl to that cluster:
	try {
		cluster = await ClusterManager.authCluster(clusterShortName);
	} catch (e) {
		logError(`[KUBE_DEPLOY] Clean up > `, e);
		return { error: e.message };
	}
	const { contextName: context } = cluster;

	const mainAppName = appSlug;

	// Clean up Prerelease YAML
	const cleanUpCommands = [];
	const prereleaseYaml = releaseData.preYaml;
	const prereleaseConfigs = [];
	yaml.loadAll(prereleaseYaml, function (doc) {
		if (doc) prereleaseConfigs.push(doc);

		// Delete INGRESS to optimize cluster
		if (doc && doc.kind == "Ingress") {
			cleanUpCommands.push(ClusterManager.deleteIngress(doc.metadata.name, doc.metadata.namespace, { context, skipOnError: true }));
		}
	});

	// Delete Prerelease SERVICE to optimize cluster
	cleanUpCommands.push(ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `phase=prerelease,main-app=${mainAppName}` }));

	// Clean up Prerelease Deployments
	cleanUpCommands.push(ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `phase=prerelease,main-app=${mainAppName}` }));

	// Clean up immediately & just ignore if any errors
	cleanUpCommands.forEach(async (cmd) => {
		try {
			await cmd;
		} catch (e) {
			logWarn(`[CLEAN UP] Ignore command: ${e}`);
		}
	});

	// * Print success:
	let msg = `🎉  PRERELEASE DEPLOYMENT DELETED  🎉`;
	logSuccess(msg);

	return { error: null, data: { prereleaseConfigs } };
}

/**
 * Roll out a release - VER 1.0
 * @param  {String} id - Release ID
 */
export async function previewPrerelease(id: string) {
	let releaseData = await DB.findOne<Release>("release", { id });

	if (isEmpty(releaseData)) return { error: `Release not found.` };

	const { slug: releaseSlug, cluster: clusterShortName, appSlug, preYaml, prereleaseUrl, namespace, env } = releaseData;

	log(`Preview the release: "${releaseSlug}" (${id})...`);

	let cluster: Cluster;
	// authenticate cluster's provider & switch kubectl to that cluster:
	try {
		cluster = await ClusterManager.authCluster(clusterShortName);
	} catch (e) {
		logError(e);
		return { error: e.message };
	}
	const { contextName: context } = cluster;
	if (!context) throw new Error(`[KUBE_DEPLOY] previewPrerelease > Cluster context not found.`);

	const tmpDir = path.resolve(CLI_DIR, `storage/releases/${releaseSlug}`);
	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

	/**
	 * Check if there is any prod namespace, if not -> create one
	 */
	const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
	if (!isNsExisted) {
		log(`[KUBE_DEPLOY] Namespace "${namespace}" not found, creating one...`);
		const createNsRes = await ClusterManager.createNamespace(namespace, { context });
		if (!createNsRes) {
			logError(
				`[KUBE_DEPLOY] Failed to create new namespace: ${namespace} (Cluster: ${clusterShortName} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env})`
			);
			return;
		}
	}

	/**
	 * Check if there is "imagePullSecrets" within prod namespace, if not -> create one
	 */
	// const allSecrets = await ClusterManager.getAllSecrets(namespace, { context });
	// let isImagePullSecretExisted = false;
	// if (allSecrets && allSecrets.length > 0) {
	// 	const imagePullSecret = allSecrets.find((s) => s.metadata.name.indexOf("docker-registry") > -1);
	// 	if (imagePullSecret) isImagePullSecretExisted = true;
	// }

	// log(`isImagePullSecretExisted :>>`, isImagePullSecretExisted);
	// if (!isImagePullSecretExisted) {
	// 	try {
	// 		await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, clusterShortName, namespace);
	// 	} catch (e) {
	// 		throw new Error(e.message);
	// 	}
	// }
	try {
		await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, clusterShortName, namespace);
	} catch (e) {
		throw new Error(`[PREVIEW] Can't create "imagePullSecrets" in the "${namespace}" namespace.`);
	}

	/**
	 * Apply PRE-RELEASE deployment YAML
	 */
	const prereleaseDeploymentRes = await ClusterManager.kubectlApplyContent(preYaml, namespace, { context });
	if (!prereleaseDeploymentRes)
		throw new Error(
			`Can't preview the pre-release "${id}" (Cluster: ${clusterShortName} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env}).`
		);

	logSuccess(`The PRE-RELEASE environment is ready to preview: https://${prereleaseUrl}`);

	return { error: null, data: releaseData };
}

/**
 * Roll out a release - VER 1.0
 * @param  {String} id - Release ID
 */
export async function rollout(id: string) {
	const releaseData = await DB.findOne<Release>("release", { id });

	if (isEmpty(releaseData)) return { error: `Release" ${id}" not found.` };

	const {
		slug: releaseSlug,
		projectSlug, // ! This is not PROJECT_ID of Google Cloud provider
		cluster: clusterShortName,
		appSlug,
		preYaml: prereleaseYaml,
		deploymentYaml,
		endpoint: endpointUrl,
		namespace,
		env,
	} = releaseData as Release;

	log(`Rolling out the release: "${releaseSlug}" (ID: ${id})`);

	// authenticate cluster's provider & switch kubectl to that cluster:
	try {
		await ClusterManager.authCluster(clusterShortName);
	} catch (e) {
		logError(e);
		return { error: e.message };
	}

	const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
	if (!cluster) {
		logError(`Cluster "${clusterShortName}" not found.`);
		return { error: `Cluster "${clusterShortName}" not found.` };
	}
	const { name: context } = await ClusterManager.getKubeContextByCluster(cluster);

	const tmpDir = path.resolve(CLI_DIR, `storage/releases/${releaseSlug}`);
	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

	// ! NEW WAY -> LESS DOWNTIME WHEN ROLLING OUT NEW DEPLOYMENT !

	/**
	 * Check if there is any prod namespace, if not -> create one
	 */
	const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
	if (!isNsExisted) {
		log(`Namespace "${namespace}" not found, creating one...`);

		const createNsRes = await ClusterManager.createNamespace(namespace, { context });
		if (!createNsRes) {
			logError(
				`[KUBE_DEPLOY] Failed to create new namespace: ${namespace} (Cluster: ${clusterShortName} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env})`
			);
			return;
		}
	}

	// log(`1`, { isNsExisted });

	/**
	 * Check if there is "imagePullSecrets" within the namespace, if not -> create one
	 */
	// const allSecrets = await ClusterManager.getAllSecrets(namespace, { context });
	// let isImagePullSecretExisted = false;
	// if (allSecrets && allSecrets.length > 0) {
	// 	const imagePullSecret = allSecrets.find((s) => s.metadata.name.indexOf("docker-registry") > -1);
	// 	if (imagePullSecret) isImagePullSecretExisted = true;
	// }
	// if (!isImagePullSecretExisted) {
	// 	try {
	// 		await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, clusterShortName, namespace);
	// 	} catch (e) {
	// 		throw new Error(`Can't create "imagePullSecrets" in the "${namespace}" namespace.`);
	// 	}
	// }
	try {
		await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, clusterShortName, namespace);
	} catch (e) {
		throw new Error(`[ROLL OUT] Can't create "imagePullSecrets" in the "${namespace}" namespace.`);
	}

	// log(`2`, { isImagePullSecretExisted });

	/**
	 * 1. Create SERVICE & INGRESS
	 */
	console.log("deploymentYaml :>> ", deploymentYaml);

	let replicas = 1,
		envVars: KubeEnvironmentVariable[] = [],
		resourceQuota: IResourceQuota = {},
		service: KubeService,
		svcName,
		ingress,
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

	const mainAppName = appSlug;

	// create new service if it's not existed
	const currentServices = await ClusterManager.getAllServices(namespace, `phase=live,main-app=${mainAppName}`, { context });

	if (!isEmpty(currentServices)) {
		// The service is existed
		service = currentServices[0];
	} else {
		// Create new PROD service
		const SVC_CONTENT = objectToDeploymentYaml(service);
		const applySvcRes = await ClusterManager.kubectlApplyContent(SVC_CONTENT, namespace, { context });
		if (!applySvcRes)
			throw new Error(
				`Cannot apply SERVICE "${service.metadata.name}" (Cluster: ${clusterShortName} / Namespace: ${namespace} / App: ${appSlug} / Env: ${env})`
			);

		log(`Created new production service named "${appSlug}".`);
	}

	// Apply "BASE_PATH" when neccessary
	const BASE_PATH = getValueOfKubeEnvVarsByName("BASE_PATH", envVars);
	if (BASE_PATH) {
		const basePathResult = await execCmd(
			`kubectl --context=${context} -n ${namespace} patch ingress ${ingressName} --type='json' -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/path", "value":"${BASE_PATH}"}]'`
		);
		console.log("[INGRESS] basePathResult :>> ", basePathResult);
	}

	// log(`4`, { currentServices });

	// ! ALWAYS Create new ingress
	const ING_CONTENT = objectToDeploymentYaml(ingress);
	const ingCreateResult = await ClusterManager.kubectlApplyContent(ING_CONTENT, namespace, { context });
	if (!ingCreateResult)
		throw new Error(
			`Failed to apply invalid INGRESS config (${env.toUpperCase()}) to "${ingressName}" in "${namespace}" namespace of "${context}" context.`
		);

	// log(`5`);

	let prereleaseApp, prereleaseAppName;
	if (env === "prod") {
		yaml.loadAll(prereleaseYaml, function (doc) {
			if (doc && doc.kind == "Service") prereleaseAppName = doc.spec.selector.app;
			if (doc && doc.kind == "Deployment") prereleaseApp = doc;
		});

		if (!prereleaseAppName) return { error: `"prereleaseAppName" is invalid.` };
		log(`prereleaseAppName =`, prereleaseAppName);

		// deploymentName = prereleaseAppName;
		// deployment = prereleaseApp;
	}

	/**
	 * 2. Delete prerelease app if it contains "prerelease" (OLD WAY)
	 * and apply new app for production
	 */

	const oldDeploys = await ClusterManager.getAllDeploys(namespace, { context, filterLabel: `phase!=prerelease,main-app=${mainAppName}` });
	log(
		`Current app deployments (to be deleted later on) >>`,
		oldDeploys.map((d) => d.metadata.name)
	);

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
		const appCreateResult = await ClusterManager.kubectlApplyContent(APP_CONTENT, namespace, { context });
		if (!appCreateResult)
			throw new Error(`Failed to apply APP DEPLOYMENT config to "${newAppName}" in "${namespace}" namespace of "${context}" context.`);

		log(`Created new deployment "${newAppName}" successfully.`);

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
		} catch (e) {
			log(`[ROLL OUT] Patch "deployment" failed >>`, e.message);
			await createNewDeployment(deployment);
		}
	}

	/**
	 * 3. [ONLY PROD DEPLOY] Update ENV variables to PRODUCTION values
	 */
	if (env === "prod") {
		const prodEnvVars = envVars.filter((envVar) => envVar.value.toString().indexOf(endpointUrl) > -1);
		console.log("prodEnvVars :>> ", prodEnvVars);

		if (!isEmpty(prodEnvVars)) {
			const setPreEnvVarRes = await ClusterManager.setEnvVar(prodEnvVars, prereleaseAppName, namespace, { context });
			if (setPreEnvVarRes) log(`Patched ENV to "${prereleaseAppName}" deployment successfully.`);
		}
	}

	// Wait until the deployment is ready!
	const isNewDeploymentReady = async () => {
		const newDeploys = await ClusterManager.getAllDeploys(namespace, { context, filterLabel: `phase=live,app=${deploymentName}` });
		// log(`${namespace} > ${deploymentName} > newDeploys :>>`, newDeploys);

		let isDeploymentReady = false;
		newDeploys.forEach((deploy) => {
			// log(`deploy.status.replicas =`, deploy.status.replicas);
			if (deploy.status.readyReplicas >= 1) isDeploymentReady = true;
		});

		log(`[INTERVAL] Checking new deployment's status -> Is Ready:`, isDeploymentReady);
		return isDeploymentReady;
	};
	const isReallyReady = await waitUntil(isNewDeploymentReady, 10, 5 * 60);
	if (!isReallyReady) {
		return {
			error: `New app deployment stucked or crashed, probably because of the unauthorized container registry or the app was crashed on start up.`,
		};
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
				`'{ "spec": { "selector": { "app": "${deploymentName}" } } }'`,
			],
			cliOpts
		);
		log(`Patched "${svcName}" service successfully >> new deployment:`, deploymentName);
	} catch (e) {
		log(`Patched "${svcName}" service unsuccessful >>`, e.message);
		// return { error: e.message };
	}

	/**
	 * 5. Scale replicas to PRODUCTION config
	 */
	try {
		await execa("kubectl", [`--context=${context}`, "scale", `--replicas=${replicas}`, `deploy`, deploymentName, `-n`, namespace], cliOpts);
		log(`Scaled "${deploymentName}" replicas to ${replicas} successfully`);
	} catch (e) {
		log(`Scaled "${deploymentName}" replicas to ${replicas} unsuccessful >>`, e.message);
	}

	/**
	 * 6. Apply resource quotas
	 */
	if (resourceQuota && resourceQuota.limits && resourceQuota.requests) {
		const resourcesStr = `--limits=cpu=${resourceQuota.limits.cpu},memory=${resourceQuota.limits.memory} --requests=cpu=${resourceQuota.requests.cpu},memory=${resourceQuota.requests.memory}`;
		const resouceCommand = `kubectl set resources deployment/${deploymentName} ${resourcesStr} -n ${namespace}`;
		try {
			await execa.command(resouceCommand);
			log(`Applied resource quotas to ${deploymentName} successfully`);
		} catch (e) {
			log(`Command failed: ${resouceCommand}`);
			log(`Applied "resources" quotas failed >>`, e.message);
		}
	}

	// Print success:
	const prodUrlInCLI = chalk.bold(`https://${endpointUrl}`);
	logSuccess(`🎉 PUBLISHED AT: ${prodUrlInCLI} 🎉`);

	// Filter previous releases:
	const filter = [{ projectSlug, appSlug, active: true }];

	// Mark previous releases as "inactive":
	await DB.update<Release>("release", { $or: filter }, { active: false });

	// Mark this latest release as "active":
	const latestReleases = await DB.update<Release>("release", { _id: new ObjectId(id) }, { active: true });

	const latestRelease = latestReleases[0];
	// log({ latestRelease });

	if (!latestRelease) {
		throw new Error(`Cannot set the latest release (${id}) status as "active".`);
	}

	/**
	 * 5. Clean up > Delete old deployments
	 */

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
						log(`Deleted ${_commands.length} app deployments.`);
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
				log(`Deleted ${oldDeploysCleanUpCommands.length} app deployments.`);
			} catch (e) {
				logWarn(e.toString());
			}
		}
	}

	/**
	 * 6. [ONLY PROD DEPLOY] Clean up prerelease deployments (to optimize cluster resource quotas)
	 */
	if (env === "prod") {
		cleanUp(releaseData)
			.then(({ error }) => {
				if (error) throw new Error(`Unable to clean up PRERELEASE of release id [${id}]`);
				logSuccess(`Clean up PRERELEASE of release id [${id}] SUCCESSFULLY.`);
			})
			.catch((e) => logError(`Unable to clean up PRERELEASE of release id [${id}]:`, e));
	}
	return { error: null, data: releaseData };
}
