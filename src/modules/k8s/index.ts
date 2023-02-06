import chalk from "chalk";
import { isJSON } from "class-validator";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import fs from "fs";
import yaml from "js-yaml";
import { isArray, isEmpty, isString, trimEnd } from "lodash";
import { ObjectId } from "mongodb";
import path from "path";

import { isServerMode } from "@/app.config";
import { cliOpts } from "@/config/config";
import { CLI_CONFIG_DIR, CLI_DIR } from "@/config/const";
import type { App, Cluster, ContainerRegistry, Release } from "@/entities";
import type { DeployEnvironment } from "@/interfaces/DeployEnvironment";
import type { IResourceQuota } from "@/interfaces/IKube";
import type { KubeConfig } from "@/interfaces/KubeConfig";
import type { KubeDeployment } from "@/interfaces/KubeDeployment";
import type { KubeNamespace } from "@/interfaces/KubeNamespace";
import type { KubeSecret } from "@/interfaces/KubeSecret";
import type { KubeService } from "@/interfaces/KubeService";
import { execCmd, objectToDeploymentYaml, waitUntil } from "@/plugins";
import { isValidObjectId } from "@/plugins/mongodb";
import AppService from "@/services/AppService";
import ClusterService from "@/services/ClusterService";
import ContainerRegistryService from "@/services/ContainerRegistryService";
import ReleaseService from "@/services/ReleaseService";

import { fetchApi } from "../api";
import custom from "../providers/custom";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";

export interface ClusterAuthOptions {
	shouldSwitchContextToThisCluster?: boolean;
}

export class ClusterManager {
	static async auth(clusterShortName: string, options: ClusterAuthOptions = { shouldSwitchContextToThisCluster: true }) {
		const { shouldSwitchContextToThisCluster = true } = options;

		// console.log("shouldSwitchContextToThisCluster :>> ", shouldSwitchContextToThisCluster);

		let filePath;

		if (!clusterShortName) {
			throw new Error(`Param "clusterShortName" is required.`);
			return;
		}

		// find the cluster in the database:
		let cluster;
		if (isServerMode) {
			const clusterSvc = new ClusterService();
			cluster = await clusterSvc.findOne({ shortName: clusterShortName });
		} else {
			const { data } = await fetchApi<Cluster>({ url: `/api/v1/cluster?shortName=${clusterShortName}` });
			cluster = data[0];
		}

		// log({ cluster });

		if (!cluster) {
			throw new Error(
				`This cluster (${clusterShortName}) is not existed, please contact your administrator or register a new one with the CLI command.`
			);
			return;
		}

		const { providerShortName } = cluster;

		if (!providerShortName) {
			throw new Error(`Param "provider" is required.`);
			return;
		}

		switch (providerShortName) {
			case "gcloud":
				// Only support Google Service Account authentication
				const { serviceAccount } = cluster;
				if (!serviceAccount) {
					throw new Error(`This cluster doesn't have any Google Service Account to authenticate, please contact your administrator.`);
				}

				filePath = path.resolve(CLI_CONFIG_DIR, `${clusterShortName}-service-account.json`);
				fs.writeFileSync(filePath, serviceAccount, "utf8");

				const gcloudAuth = await gcloud.authenticate({ filePath });
				if (!gcloudAuth) {
					throw new Error(`[UNKNOWN] Cannot authenticate the Google Cloud provider.`);
				}

				logSuccess(`[CLUSTER MANAGER] Connected to "${clusterShortName}" cluster.`);
				if (shouldSwitchContextToThisCluster) this.switchTo(clusterShortName);
				return true;

			case "digitalocean":
				// Only support Digital Ocean API access token authentication
				const { apiAccessToken } = cluster;
				if (!apiAccessToken) {
					throw new Error(
						`This cluster doesn't have any Digital Ocean API access token to authenticate, please contact your administrator.`
					);
					return;
				}

				const doAuth = await digitalocean.authenticate({ key: apiAccessToken });
				if (!doAuth) {
					throw new Error(`[UNKNOWN] Cannot authenticate the Digital Ocean provider.`);
				}

				logSuccess(`[CLUSTER MANAGER] Connected to "${clusterShortName}" cluster.`);
				if (shouldSwitchContextToThisCluster) this.switchTo(clusterShortName);
				return true;

			case "custom":
				// Only support "kube-config" authentication
				const { kubeConfig } = cluster;
				if (!kubeConfig) {
					throw new Error(`This cluster doesn't have any "kube-config" data to authenticate, please contact your administrator.`);
				}

				filePath = process.env.STORAGE
					? path.resolve(process.env.STORAGE, `${clusterShortName}-kube-config.yaml`)
					: path.resolve(CLI_CONFIG_DIR, `${clusterShortName}-kube-config.yaml`);

				fs.writeFileSync(filePath, kubeConfig, "utf8");

				logSuccess(`[CLUSTER MANAGER] Connected to "${clusterShortName}" cluster.`);
				if (shouldSwitchContextToThisCluster) this.switchTo(clusterShortName, filePath);
				return true;

			default:
				throw new Error(`This provider (${providerShortName}) is not supported yet.`);
				return;
		}
	}

	static async getKubeConfig(filePath?: string) {
		let currentKubeConfigContent;

		if (filePath) {
			if (!fs.existsSync(filePath)) {
				throw new Error(`File "${filePath}" not found.`);
				return;
			}
			currentKubeConfigContent = await execCmd(`kubectl config --kubeconfig ${filePath} view --flatten`);
		} else {
			currentKubeConfigContent = await execCmd(`kubectl config view --flatten`, `Can't get current "kubeconfig"`);
		}

		const currentKubeConfig = yaml.load(currentKubeConfigContent);

		return currentKubeConfig as KubeConfig;
	}

	static async retrieveClusterInfo(clusterShortName: string, kubeConfigFile?: string) {
		if (!clusterShortName) {
			throw new Error(`Cluster short name is required.`);
		}

		let cluster;
		if (isServerMode) {
			const clusterSvc = new ClusterService();
			cluster = await clusterSvc.findOne({ shortName: clusterShortName });
		} else {
			const { status, data, messages } = await fetchApi<Cluster>({ url: `/api/v1/cluster?shortName=${clusterShortName}` });
			cluster = data[0];
		}

		if (!cluster) {
			throw new Error(`Cannot retrieve cluster info of "${clusterShortName}".`);
		}

		const { shortName, zone, projectID, provider, providerShortName, kubeConfig } = cluster;

		switch (providerShortName) {
			case "gcloud":
				await execCmd(`gcloud container clusters get-credentials ${clusterShortName} --zone=${zone} --project=${projectID}`);
				return { error: null, shortName };

			case "digitalocean":
				await execCmd(`doctl kubenetes cluster kubeconfig save ${clusterShortName}`);
				return { error: null, shortName };

			case "custom":
				const filePath = kubeConfigFile || path.resolve(CLI_CONFIG_DIR, `${clusterShortName}-kubeconfig.yaml`);
				fs.writeFileSync(filePath, kubeConfig, "utf8");
				await custom.authenticate({ filePath });
				return { error: null, shortName };
				break;

			default:
				return { error: `This provider (${provider}) is not supported yet.` };
		}
	}

	static async switchTo(clusterShortName: string, kubeConfigFile?: string) {
		let cluster;
		// log("[CLUSTER MANAGER] switchTo() > clusterShortName :>> ", clusterShortName);

		// Find in kubectl context, if it's existed, no need to auth
		const kubeConfig = await ClusterManager.getKubeConfig();
		// console.log("switchTo() > kubeConfig.clusters :>> ", kubeConfig.clusters);

		const foundCluster = (kubeConfig.clusters || []).find(
			(_cluster) => _cluster.name === clusterShortName || _cluster.name.indexOf(clusterShortName) > -1
		);
		if (foundCluster) cluster = foundCluster.name;

		// console.log("kubeConfig > current-context :>> ", kubeConfig["current-context"]);

		if (foundCluster && kubeConfig["current-context"] === cluster) return { error: null, shortName: clusterShortName };

		try {
			// Should try to retrieve this cluster info automatically
			await this.retrieveClusterInfo(clusterShortName, kubeConfigFile);

			// [AGAIN] Find in kubectl context, if it's existed -> get correct "context" name
			const _kubeConfig = await ClusterManager.getKubeConfig();
			const _foundCluster = (_kubeConfig.clusters || []).find(
				(_cluster) => _cluster.name === clusterShortName || _cluster.name.indexOf(clusterShortName) > -1
			);
			if (_foundCluster) {
				cluster = _foundCluster.name;
			} else {
				logError(`[CLUSTER MANAGER] Cannot switch current kube context to "${clusterShortName}".`);
				return;
			}
		} catch (e) {
			logWarn(`[CLUSTER MANAGER] Retrieve cluster info failed: ${e}`);
		}

		// found this cluster in kubeconfig -> switch to it!
		await execCmd(`kubectl config use-context ${cluster}`, `[CLUSTER MANAGER] Cannot switch current kube context to "${clusterShortName}"`);

		log(`[CLUSTER MANAGER] Switched to "${cluster}" cluster.`);
		return cluster;
	}

	/**
	 * Return "current-context" (current cluster shortname) in "~/.kube/config" file
	 */
	static async currentCluster() {
		const kubeConfig = await this.getKubeConfig();
		return kubeConfig["current-context"];
	}

	/**
	 * Create imagePullSecrets in a namespace
	 */
	static async createImagePullSecretsInNamespace(appSlug: string, env: string, namespace: string = "default") {
		let message = "";

		let app: App;
		if (isServerMode) {
			const appSvc = new AppService();
			app = await appSvc.findOne({ slug: appSlug });
		} else {
			const { data: apps } = await fetchApi<App>({ url: `/api/v1/app?slug=${appSlug}` });
			app = apps[0];
		}

		if (!app) throw new Error(`App "${appSlug}" not found.`);

		const deployEnvironment = (isJSON(app.environment[env]) ? JSON.parse(app.environment[env] as string) : {}) as DeployEnvironment;
		if (isEmpty(deployEnvironment)) {
			throw new Error(`Deploy environment (${env}) of "${appSlug}" app not found.`);
		}

		const { registry: regSlug } = deployEnvironment;
		let registry;

		if (isServerMode) {
			const registrySvc = new ContainerRegistryService();
			registry = await registrySvc.findOne({ slug: regSlug });
		} else {
			const { data: registries } = await fetchApi<ContainerRegistry>({ url: `/api/v1/registry?slug=${regSlug}` });
			registry = registries[0];
		}

		if (!registry) throw new Error(`Container Registry (${regSlug}) of "${appSlug}" app not found.`);

		try {
			let imagePullSecret;
			switch (registry.provider) {
				case "gcloud":
					imagePullSecret = await gcloud.createImagePullingSecret({
						namespace: namespace,
						registrySlug: registry.slug,
						providerShortName: registry.provider,
						shouldCreateSecretInNamespace: true,
					});
					break;

				case "digitalocean":
					imagePullSecret = await digitalocean.createImagePullingSecret({
						namespace: namespace,
						registrySlug: registry.slug,
						providerShortName: registry.provider,
						shouldCreateSecretInNamespace: true,
					});
					break;

				case "custom":
					imagePullSecret = await custom.createImagePullingSecret({
						namespace: namespace,
						registrySlug: registry.slug,
						providerShortName: registry.provider,
						shouldCreateSecretInNamespace: true,
					});
					break;

				default:
					message = `This cloud provider "${registry.provider}" is not supported yet.`;
					throw new Error(message);
					break;
			}

			if (imagePullSecret && imagePullSecret.name) {
				message = `Created "imagePullSecret" named "${imagePullSecret.name}" successfully.`;
				log(message);
			} else {
				throw new Error(`Something is wrong. Create "imagePullSecrets" failed.`);
			}

			return imagePullSecret;
		} catch (e) {
			message = `[ERROR] Creating "imagePullSecret" failed -> ${e.toString()}`;
			throw new Error(message);
		}
	}

	/**
	 * Get all namepsaces of a cluster
	 */
	static async getAllNamespaces() {
		try {
			const { stdout } = await execa.command(`kubectl get namespace -o json`);
			return JSON.parse(stdout).items as KubeNamespace[];
		} catch (e) {
			throw new Error(e.message);
			return;
		}
	}

	/**
	 * Check whether this namespace was existed
	 */
	static async isNamespaceExisted(namespace: string) {
		const allNamespaces = await this.getAllNamespaces();
		if (!allNamespaces) return false;
		return typeof allNamespaces.find((ns) => ns.metadata.name === namespace) !== "undefined";
	}

	/**
	 * Get all secrets of a namespace
	 */
	static async getAllSecrets(namespace: string = "default") {
		try {
			const { stdout } = await execa.command(`kubectl get secret -n ${namespace} -o json`);
			return JSON.parse(stdout).items as KubeSecret[];
		} catch (e) {
			throw new Error(e.message);
			return;
		}
	}

	/**
	 * Check whether this secret was existed in the namespace
	 */
	static async isSecretExisted(name: string, namespace: string = "default") {
		const allSecrets = await this.getAllSecrets(namespace);
		if (!allSecrets) return false;
		return typeof allSecrets.find((ns) => ns.metadata.name === name) !== "undefined";
	}

	static async getDeploy(name, namespace = "default") {
		try {
			const args = ["-n", namespace, "get", "deploy", name, "-o", "json"];
			const { stdout } = await execa("kubectl", args);
			return JSON.parse(stdout) as KubeDeployment;
		} catch (e) {
			throw new Error(e.message);
			return;
		}
	}

	static async deleteDeploy(name, namespace = "default") {
		try {
			const args = ["-n", namespace, "delete", "deploy", name];
			const { stdout } = await execa("kubectl", args);
			return JSON.parse(stdout);
		} catch (e) {
			return { error: e.message };
		}
	}

	/**
	 * Get all deployments of a namespace
	 */
	static async getAllDeploys(namespace = "default", labelFilter = {} as any) {
		try {
			const args = ["-n", namespace, "get", "deploy"];
			if (!isEmpty(labelFilter)) {
				args.push("-l", labelFilter);
			}
			args.push("-o", "json");
			const { stdout } = await execa("kubectl", args);
			const { items } = JSON.parse(stdout);
			return items as KubeDeployment[];
		} catch (e) {
			throw new Error(e.message);
			return [];
		}
	}

	static async getService(name, namespace = "default") {
		try {
			const args = ["-n", namespace, "get", "svc", name, "-o", "json"];
			const { stdout } = await execa("kubectl", args);
			return JSON.parse(stdout) as KubeService;
		} catch (e) {
			throw new Error(e.message);
			return;
		}
	}

	static async getAllServices(namespace = "default", labelFilter = {} as any) {
		// const authRes = await this.auth(options);
		// if (authRes.error) return authRes;

		try {
			const args = ["-n", namespace, "get", "svc"];
			if (!isEmpty(labelFilter)) {
				args.push("-l", labelFilter);
			}
			args.push("-o", "json");
			const { stdout } = await execa("kubectl", args);
			const { items } = JSON.parse(stdout);
			return items as KubeService[];
		} catch (e) {
			throw new Error(e.message);
			return [];
		}
	}

	static async getPod(name, namespace = "default") {
		// const authRes = await this.auth(options);
		// if (authRes.error) return authRes;

		try {
			const args = ["-n", namespace, "get", "pod", name, "-o", "json"];
			const { stdout } = await execa("kubectl", args);
			return JSON.parse(stdout);
		} catch (e) {
			return { error: e.message };
		}
	}

	static async getAllPods(namespace = "default") {
		// const authRes = await this.auth(options);
		// if (authRes.error) return authRes;

		try {
			const args = ["-n", namespace, "get", "pod", "-o", "json"];
			const { stdout } = await execa("kubectl", args);
			const { items } = JSON.parse(stdout);
			return items;
		} catch (e) {
			return { error: e.message };
		}
	}

	static async getIngress(name, namespace = "default") {
		// const authRes = await this.auth(options);
		// if (authRes.error) return authRes;

		try {
			const args = ["-n", namespace, "get", "ing", name, "-o", "json"];
			const { stdout } = await execa("kubectl", args);
			return JSON.parse(stdout);
		} catch (e) {
			return { error: e.message };
		}
	}

	/**
	 * Roll out a release - VER 1.0
	 * @param  {String} id - Release ID
	 */
	static async previewPrerelease(id: string) {
		log(`ClusterManager > PREVIEW PRE-RELEASE > Release ID >>`, id);

		let releaseData;
		if (isServerMode) {
			const releaseSvc = new ReleaseService();
			releaseData = await releaseSvc.findOne({ id });
		} else {
			const res = await fetchApi<Release>({ url: `/api/v1/release?id=${id}` });
			releaseData = res.data;
		}

		if (isEmpty(releaseData)) return { error: `Release not found.` };

		const { slug: releaseSlug, cluster, appSlug, preYaml, prereleaseUrl, namespace, env } = releaseData as Release;

		log(`Preview the release: "${releaseSlug}" (${id})...`);

		// authenticate cluster's provider & switch kubectl to that cluster:
		try {
			await ClusterManager.auth(cluster);
		} catch (e) {
			logError(e);
			return { error: e.message };
		}

		const tmpDir = path.resolve(`storage/releases/${releaseSlug}`);
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		/**
		 * Check if there is any prod namespace, if not -> create one
		 */
		const isNsExisted = await this.isNamespaceExisted(namespace);
		if (!isNsExisted) {
			log(`Namespace "${namespace}" not found, creating one...`);
			await execCmd(`kubectl create namespace ${namespace}`);
		}

		/**
		 * Check if there is "imagePullSecrets" within prod namespace, if not -> create one
		 */
		const allSecrets = await this.getAllSecrets(namespace);
		let isImagePullSecretExisted = false;
		if (allSecrets && allSecrets.length > 0) {
			const imagePullSecret = allSecrets.find((s) => s.metadata.name.indexOf("docker-registry") > -1);
			if (imagePullSecret) isImagePullSecretExisted = true;
		}

		log(`isImagePullSecretExisted :>>`, isImagePullSecretExisted);
		if (!isImagePullSecretExisted) {
			try {
				await this.createImagePullSecretsInNamespace(appSlug, env, namespace);
			} catch (e) {
				throw new Error(e.message);
				return;
			}
		}

		/**
		 * Apply PRE-RELEASE deployment YAML
		 */
		const prereleaseDeploymentFile = path.resolve(tmpDir, "deploy.prerelease.yaml");
		fs.writeFileSync(prereleaseDeploymentFile, preYaml, "utf8");
		await execCmd(`kubectl apply -f ${prereleaseDeploymentFile}`, `Can't preview the pre-release "${id}".`);

		logSuccess(`The PRE-RELEASE environment is ready to preview: https://${prereleaseUrl}`);

		return { error: null, data: releaseData };
	}

	/**
	 * Roll out a release - VER 1.0
	 * @param  {String} id - Release ID
	 */
	static async rollout(id: string) {
		// let releaseData: Release;
		// log(`ClusterManager > rollout > Release ID >>`, id);
		// log(`ClusterManager > rollout > releaseApiPath >>`, releaseApiPath);

		let releaseData, releaseSvc;
		if (isServerMode) {
			releaseSvc = new ReleaseService();
			releaseData = await releaseSvc.findOne({ id });
		} else {
			const releaseApiPath = `/api/v1/release?id=${id}`;
			const { data } = await fetchApi<Release>({ url: releaseApiPath });
			releaseData = data as Release;
		}

		// log(`ClusterManager > rollout > data >>`, data);
		// log(`ClusterManager > rollout > releaseData >>`, releaseData);

		if (isEmpty(releaseData)) return { error: `Release" ${id}" not found.` };

		const {
			slug: releaseSlug,
			projectSlug, // ! This is not PROJECT_ID of Google Cloud provider
			cluster,
			appSlug,
			preYaml: prereleaseYaml,
			deploymentYaml,
			endpoint: endpointUrl,
			namespace,
			env,
			// diginext, // <--- appConfig
			// provider, // <--- cloud provider
			// providerProjectId, // <--- this is PROJECT_ID of Google Cloud project
			// projectSlug,
		} = releaseData as Release;

		log(`Rolling out the release: "${releaseSlug}" (ID: ${id})`);

		// authenticate cluster's provider & switch kubectl to that cluster:
		try {
			await ClusterManager.auth(cluster);
		} catch (e) {
			logError(e);
			return { error: e.message };
		}

		const tmpDir = path.resolve(CLI_DIR, `storage/releases/${releaseSlug}`);
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		// ! NEW WAY -> LESS DOWNTIME WHEN ROLLING OUT NEW DEPLOYMENT !

		/**
		 * Check if there is any prod namespace, if not -> create one
		 */
		const isNsExisted = await this.isNamespaceExisted(namespace);
		if (!isNsExisted) {
			log(`Namespace "${namespace}" not found, creating one...`);
			await execCmd(`kubectl create namespace ${namespace}`);
		}

		// log(`1`, { isNsExisted });

		/**
		 * Check if there is "imagePullSecrets" within prod namespace, if not -> create one
		 */
		const allSecrets = await this.getAllSecrets(namespace);
		let isImagePullSecretExisted = false;
		if (allSecrets && allSecrets.length > 0) {
			const imagePullSecret = allSecrets.find((s) => s.metadata.name.indexOf("docker-registry") > -1);
			if (imagePullSecret) isImagePullSecretExisted = true;
		}
		if (!isImagePullSecretExisted) {
			try {
				await this.createImagePullSecretsInNamespace(appSlug, env, namespace);
			} catch (e) {
				throw new Error(`Can't create "imagePullSecrets" in the "${namespace}" namespace.`);
				return;
			}
		}

		// log(`2`, { isImagePullSecretExisted });

		/**
		 * 1. Create SERVICE & INGRESS
		 */

		let replicas = 1,
			envVars: { [key: string]: any } = {},
			resourceQuota: IResourceQuota = {},
			service,
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
		const currentServices = await this.getAllServices(namespace, `phase=live,main-app=${mainAppName}`);

		if (!isEmpty(currentServices)) {
			// The service is existed
			service = currentServices[0];
		} else {
			// Create new PROD service
			const SVC_FILE = path.resolve(tmpDir, `service.${env}.yaml`);
			let SVC_CONTENT = objectToDeploymentYaml(service);
			fs.writeFileSync(SVC_FILE, SVC_CONTENT, "utf8");

			try {
				await execa.command(`kubectl apply -f ${SVC_FILE} -n ${namespace}`, cliOpts);
				log(`Created new production service named "${appSlug}".`);
			} catch (e) {
				log(e);
			}
		}
		// Apply "BASE_PATH" when neccessary
		if (typeof envVars.BASE_PATH !== "undefined") {
			const basePathResult = await execCmd(
				`kubectl -n ${namespace} patch ingress ${ingressName} --type='json' -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/path", "value":"${envVars.BASE_PATH}"}]'`
			);
			console.log("[INGRESS] basePathResult :>> ", basePathResult);
		}

		// log(`4`, { currentServices });

		// create new PROD ingress if it's not existed
		const getIngressResult = await this.getIngress(ingressName, namespace);
		if (!getIngressResult.error) {
			ingress = getIngressResult;
		} else {
			// Create new ingress
			const ING_FILE = path.resolve(tmpDir, `ingress.${env}.yaml`);
			let ING_CONTENT = objectToDeploymentYaml(ingress);
			fs.writeFileSync(ING_FILE, ING_CONTENT, "utf8");

			try {
				await execa.command(`kubectl apply -f ${ING_FILE} -n ${namespace}`, cliOpts);
				log(`Created new production ingress named "${appSlug}".`);
			} catch (e) {
				log(e);
			}
		}
		// log(`5`);

		let prereleaseApp, prereleaseAppName;
		if (env === "prod") {
			yaml.loadAll(prereleaseYaml, function (doc) {
				if (doc && doc.kind == "Service") prereleaseAppName = doc.spec.selector.app;
				if (doc && doc.kind == "Deployment") prereleaseApp = doc;
			});

			if (!prereleaseAppName) return { error: `"prereleaseAppName" is invalid.` };
			log(`prereleaseAppName =`, prereleaseAppName);

			deploymentName = prereleaseAppName;
			deployment = prereleaseApp;
		}

		/**
		 * 2. Delete prerelease app if it contains "prerelease" (OLD WAY)
		 * and apply new app for production
		 */

		const oldDeploys = await this.getAllDeploys(namespace, "phase!=prerelease,main-app=" + mainAppName);
		log(
			`Current app deployments (to be deleted later on) >>`,
			oldDeploys.map((d) => d.metadata.name)
		);

		const createNewDeployment = async (appDoc) => {
			const newApp = appDoc;
			// newApp.metadata.name = prereleaseAppName;
			const newAppName = newApp.metadata.name;

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

			const APP_FILE = path.resolve(tmpDir, `deploy.${env === "prod" ? "prerelease" : env}.yaml`);
			let APP_CONTENT = objectToDeploymentYaml(newApp);
			fs.writeFileSync(APP_FILE, APP_CONTENT, "utf8");

			await execCmd(`kubectl apply -f ${APP_FILE} -n ${namespace}`);

			log(`Created new deployment: "deployment/${newAppName}" successfully.`);

			return newApp;
		};

		if (deploymentName.indexOf("prerelease") > -1 || isEmpty(oldDeploys)) {
			// ! if "prerelease" was deployed in OLD WAY or there are no old deployments
			await createNewDeployment(deployment);
		} else {
			// ! if "prerelease" was deployed in NEW WAY -> add label "phase" = "live"
			try {
				await execa(
					`kubectl`,
					["patch", "deploy", deploymentName, "-n", namespace, "--patch", `'{ "metadata": { "labels": { "phase": "live" } } }'`],
					cliOpts
				);
			} catch (e) {
				// log(`Patch "deployment" failed >>`, e.message);
				await createNewDeployment(deployment);
			}
		}

		/**
		 * 3. [ONLY PROD DEPLOY] Update ENV variables to PRODUCTION values
		 */
		if (env === "prod") {
			let envListStr = "";
			envVars.map(({ name, value }) => {
				// only replace the domain from PRERELEASE DOMAIN to PRODUCTION DOMAIN:
				if (isString(value) && value.indexOf(endpointUrl) > -1) {
					envListStr += `${name}=${value} `;
				}
			});
			log(`envListStr:`, envListStr);

			if (envListStr != "") {
				envListStr = trimEnd(" ");
				let envCommand = `kubectl set env deployment/${prereleaseAppName} ${envListStr} -n ${namespace}`;
				try {
					await execa.command(envCommand, cliOpts);
					log(`Patched ENV to "deployment/${prereleaseAppName}" successfully.`);
				} catch (e) {
					log(`Command failed: ${envCommand}`);
					log(`Patch deployment's environment variables failed >>`, e.message);
				}
			}
		}

		// Wait until the deployment is ready!
		const isNewDeploymentReady = async () => {
			const newDeploys = await ClusterManager.getAllDeploys(namespace, "phase=live,app=" + deploymentName);
			// log(`newDeploys :>>`, newDeploys);

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
			return { error: `New app deployment stucked or crashed.` };
		}

		/**
		 * 4. Update "selector" of PRODUCTION SERVICE to select PRERELEASE APP NAME
		 */
		try {
			await execa(
				`kubectl`,
				[`patch`, "service", svcName, "-n", namespace, "--patch", `'{ "spec": { "selector": { "app": "${deploymentName}" } } }'`],
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
			await execa("kubectl", ["scale", `--replicas=${replicas}`, `deploy`, deploymentName, `-n`, namespace], cliOpts);
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

		let latestRelease;
		// Mark previous releases as "inactive":
		if (isServerMode) {
			await releaseSvc.update({ $or: filter }, { active: false });
			latestRelease = await releaseSvc.update({ _id: new ObjectId(id) }, { active: true });
		} else {
			await fetchApi<Release>({
				url: `/api/v1/release?or=${JSON.stringify(filter)}`,
				data: { active: false },
				method: "PATCH",
			});

			// Mark this latest release as "active":
			const { data } = await fetchApi<Release>({ url: `/api/v1/release?id=${id}`, method: "PATCH", data: { active: true } });
			latestRelease = data;
		}
		// Mark this latest release as "active":
		// log({ latestRelease });
		if (!latestRelease) {
			throw new Error(`Cannot set the latest release (${id}) status as "active".`);
			return;
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
					return execa.command(`kubectl delete deploy ${deployName} -n ${namespace}`, cliOpts);
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
			this.cleanUp(releaseData)
				.then(({ error }) => {
					if (error) throw new Error(`Unable to clean up PRERELEASE of release id [${id}]`);
					logSuccess(`Clean up PRERELEASE of release id [${id}] SUCCESSFULLY.`);
				})
				.catch((e) => logError(`Unable to clean up PRERELEASE of release id [${id}]:`, e));
		}
		return { error: null, data: releaseData };
	}

	/**
	 * Clean up PRERELEASE resources by ID or release data
	 * @param idOrRelease - Release ID or {Release} data
	 */
	static async cleanUp(idOrRelease: string | Release) {
		let releaseData: Release;

		// validation
		if (isValidObjectId(idOrRelease)) {
			let data;
			if (isServerMode) {
				const releaseSvc = new ReleaseService();
				data = await releaseSvc.findOne({ id: idOrRelease });
			} else {
				const res = await fetchApi<Release>({ url: `/api/v1/release?id=${idOrRelease}` });
				data = res.data;
			}

			if (!data) {
				throw new Error(`Release "${idOrRelease}" not found.`);
				return { error: "Release not found." };
			}
			releaseData = data as Release;
		} else {
			if (!(idOrRelease as Release).appSlug) {
				throw new Error(`Release "${idOrRelease}" is invalid.`);
				return { error: "Release data is invalid." };
			}
			releaseData = idOrRelease as Release;
		}

		const namespace = releaseData.namespace;
		// const projectSlug = releaseData.projectSlug;
		const appSlug = releaseData.appSlug;
		const mainAppName = appSlug;

		// Clean up Prerelease YAML
		const cleanUpCommands = [];
		const prereleaseYaml = releaseData.preYaml;
		const prereleaseConfigs = [];
		yaml.loadAll(prereleaseYaml, function (doc) {
			if (doc) prereleaseConfigs.push(doc);

			// Delete INGRESS to optimize cluster
			if (doc && doc.kind == "Ingress") {
				cleanUpCommands.push(execa.command(`kubectl delete ingress ${doc.metadata.name} -n ${doc.metadata.namespace}`));
			}
		});

		// Delete Prerelease SERVICE to optimize cluster
		cleanUpCommands.push(execa.command(`kubectl delete service -n ${namespace} -l phase=prerelease,main-app=${mainAppName}`, cliOpts));

		// Clean up Prerelease Deployments
		cleanUpCommands.push(execa.command(`kubectl delete deployment -n ${namespace} -l phase=prerelease,main-app=${mainAppName}`, cliOpts));

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
	 * Roll out deployments - VER 2.0 (new flow, less downtime) - include these steps:
	 * 1. ReplicaSet: Replace Prerelease ENV with PROD environments
	 * 2. ReplicaSet: Scale up to PROD replicas
	 * 3. Patch Prerelease ReplicaSet & Service Labels: phase: "live" -> "old" and phase: "prerelease" -> "live"
	 * 4. Create PROD Service if it's not existed
	 * 5. Create PROD Ingress if it's not existed
	 * 6. Map PROD Ingress to [new] PROD Service
	 * 7. Clean up OLD PROD deployments
	 */
	static async rolloutV2(id) {
		// let releaseData: Release;
		// const { data } = await fetchApi<Release>({ url: `/api/v1/release?id=${id}` });
		// releaseData = data as Release;
		// // log(`releaseData >>`, releaseData);
		// const {
		// 	slug: releaseSlug,
		// 	diginext, // appConfig
		// 	project, // ! This is not PROJECT_ID on the cloud provider
		// 	provider,
		// 	cluster,
		// 	providerProjectId,
		// 	projectSlug,
		// 	preYaml: prereleaseYaml,
		// 	prodYaml: productionYaml,
		// 	productionUrl: productionDomain,
		// 	namespace,
		// } = releaseData as Release;
		// const appConfig: AppConfig = diginext;
		// // auth & switch to targeted cluster:
		// const authRes = await ClusterManager.auth(cluster);
		// 1. ReplicaSet: Replace Prerelease ENV with PROD environments
		// 2. ReplicaSet: Scale up to PROD replicas
		// 3. Patch Prerelease ReplicaSet & Service Labels: phase: "live" -> "old" and phase: "prerelease" -> "live"
		// 4. Create PROD Service if it's not existed
		// 5. Create PROD Ingress if it's not existed
		// 6. Map PROD Ingress to [new] PROD Service
		// 7. Clean up OLD PROD deployments
	}
}

export default ClusterManager;
