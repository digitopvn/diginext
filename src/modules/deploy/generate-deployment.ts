import { logError, logWarn } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import dotenv from "dotenv";
import * as fs from "fs";
import yaml from "js-yaml";
import _, { isEmpty } from "lodash";
import path from "path";

import { isServerMode } from "@/app.config";
import { getContainerResourceBySize } from "@/config/config";
import { DIGINEXT_DOMAIN, FULL_DEPLOYMENT_TEMPLATE_PATH, NAMESPACE_TEMPLATE_PATH } from "@/config/const";
import type { App, Cluster, ContainerRegistry } from "@/entities";
import type { DeployEnvironment } from "@/interfaces";
import type InputOptions from "@/interfaces/InputOptions";
import type { KubeIngress } from "@/interfaces/KubeIngress";
import { getAppConfig, objectToContainerEnv, objectToDeploymentYaml, trimFirstSlash } from "@/plugins";
import { AppService } from "@/services";

import fetchApi from "../api/fetchApi";
import { generateDomains } from "./generate-domain";

export const generateDeployment = async (options: InputOptions) => {
	const { env, targetDirectory: appDirectory, buildNumber } = options;

	const appConfig = getAppConfig(appDirectory);

	// create "deployment" directory if it's not existed:
	// const deployConfigDir = path.resolve(appDirectory, "deployment");
	// if (!fs.existsSync(deployConfigDir)) fs.mkdirSync(deployConfigDir);

	// DEFINE DEPLOYMENT PARTS:
	const BUILD_NUMBER = buildNumber || makeDaySlug();

	const registrySlug = appConfig.environment[env].registry;
	let nsName = appConfig.environment[env].namespace;
	let ingName = appConfig.slug.toLowerCase();
	let svcName = appConfig.slug.toLowerCase();
	let appName = appConfig.slug.toLowerCase() + "-" + BUILD_NUMBER;
	let mainAppName = makeSlug(appConfig.name).toLowerCase();
	let basePath = appConfig.environment[env].basePath ?? "";

	// Prepare for building docker image
	const { imageURL } = appConfig.environment[env];

	// const DEPLOYMENT_DIR = path.resolve(appDirectory, "deployment");
	// const NAMESPACE_FILE = path.resolve(DEPLOYMENT_DIR, `namespace.${env}.yaml`);
	// const DEPLOYMENT_FILE = path.resolve(DEPLOYMENT_DIR, `deployment.${env}.yaml`);

	// TODO: Replace BUILD_NUMBER so it can work with Skaffold
	const IMAGE_NAME = `${imageURL}:${BUILD_NUMBER}`;
	// const IMAGE_NAME = `${appConfig.environment[env].imageURL}`;
	// const DEPLOY_NAME = `${APP_NAME}-${BUILD_NUMBER}`;

	let projectSlug = appConfig.project;
	let domains = appConfig.environment[env].domains;
	let replicas = options.replicas ?? appConfig.environment[env].replicas ?? 1;

	const BASE_URL = domains && domains.length > 0 ? `https://${domains[0]}` : `http://${svcName}.${nsName}.svc.cluster.local`;
	const clusterShortName = appConfig.environment[env].cluster;

	// get container registry
	const { data: registries } = await fetchApi<ContainerRegistry>({ url: `/api/v1/registry?slug=${registrySlug}` });
	if (isEmpty(registries)) {
		logError(`Cannot find any container registries with slug as "${registrySlug}", please contact your admin or create a new one.`);
		return;
	}
	const registry = (registries as ContainerRegistry[])[0];

	// get destination cluster
	const { data: clusters } = await fetchApi<Cluster>({ url: `/api/v1/cluster?shortName=${clusterShortName}` });
	if (isEmpty(clusters)) {
		logError(`Cannot find any clusters with short name as "${clusterShortName}", please contact your admin or create a new one.`);
		return;
	}
	const cluster = (clusters as Cluster[])[0];

	// get registry secret as image pulling secret:
	const { imagePullingSecret } = registry;
	// log({ imagePullingSecret });

	// prerelease:
	const prereleaseSubdomainName = `${appName}.prerelease`;
	let prereleaseSvcName = appName;
	let prereleaseAppName = appName;
	let prereleaseIngressDoc, prereleaseSvcDoc, prereleaseDeployDoc;
	let prereleaseDomain;

	// Setup a domain for prerelease
	if (env == "prod") {
		const { status, domain } = await generateDomains({
			primaryDomain: DIGINEXT_DOMAIN,
			subdomainName: prereleaseSubdomainName,
			clusterShortName: appConfig.environment[env].cluster,
		});
		if (status === 0) {
			logError(`Can't create "prerelease" domain: ${domain}`);
			return;
		}
		prereleaseDomain = domain;
	}

	// Prepare ENV files from templates:
	// let cliEnvTemplatePath = BUILD_ENV_PATH;

	// Find the relevant ENV file:
	const currentEnvFile = path.resolve(appDirectory, `.env.${env}`);
	// let shouldCreateEnv = fs.existsSync(currentEnvFile) === false;
	// if (options.shouldUseTemplate) shouldCreateEnv = true;

	// if (shouldCreateEnv) await copy(cliEnvTemplatePath, currentEnvFile, { overwrite: true });
	let defaultEnvs: any = {};
	if (fs.existsSync(currentEnvFile)) {
		defaultEnvs = dotenv.parse(fs.readFileSync(currentEnvFile));

		// Lấy BASE_PATH hoặc NEXT_PUBLIC_BASE_PATH từ user config ENV:
		basePath = typeof defaultEnvs.BASE_PATH == "undefined" ? basePath : defaultEnvs.BASE_PATH;
		basePath = trimFirstSlash(basePath);
		defaultEnvs.NODE_URL = BASE_URL;
	}

	// convert ENV variables object to K8S environment:
	const containerEnvs = objectToContainerEnv(defaultEnvs);

	// prerelease ENV variables:
	let prereleaseEnvs = JSON.parse(JSON.stringify(containerEnvs));
	if (domains && domains.length > 0) {
		prereleaseEnvs.forEach((envVar) => {
			let curValue = envVar.value.toString();
			if (curValue.indexOf(domains[0]) > -1) {
				// replace all production domains with PRERELEASE domains
				envVar.value = curValue.replace(new RegExp(domains[0], "gi"), prereleaseDomain);
			}
		});
	}

	// Should inherit the "ingress" config from the previous deployment?
	let deployData: DeployEnvironment,
		previousDeployment,
		previousIng: KubeIngress = { metadata: { annotations: {} } };

	if (options.shouldInherit) {
		let app: App;
		if (isServerMode) {
			const appSvc = new AppService();
			app = await appSvc.findOne({ slug: appConfig.slug });
		} else {
			const { data: fetchedApps } = await fetchApi<App>({ url: `/api/v1/registry?slug=${appConfig.slug}` });
			if (fetchedApps && fetchedApps[0]) app = fetchedApps[0];
		}

		if (app) {
			try {
				deployData = JSON.parse(app.environment[env] as string);
				previousDeployment = yaml.loadAll(deployData.deploymentYaml);
				// previousDeployment = yaml.loadAll(fs.readFileSync(previousDeploymentPath, "utf8"));

				previousDeployment.map((doc, index) => {
					if (doc && doc.kind == "Ingress") previousIng = doc;
				});
			} catch (e) {
				logWarn(e);
			}
		}
	}

	// write namespace.[env].yaml
	let namespaceContent = fs.readFileSync(NAMESPACE_TEMPLATE_PATH, "utf8");

	let namespaceObject = yaml.load(namespaceContent);
	namespaceObject.metadata.name = nsName;
	namespaceObject.metadata.labels = namespaceObject.metadata.labels || {};
	namespaceObject.metadata.labels.project = projectSlug.toLowerCase();
	namespaceObject.metadata.labels.owner = options.username.toLowerCase();
	namespaceObject.metadata.labels.workspace = options.workspace.slug.toLowerCase();

	namespaceContent = objectToDeploymentYaml(namespaceObject);
	// fs.writeFileSync(NAMESPACE_FILE, namespaceContent, "utf8");

	// write deployment.[env].yaml (ing, svc, deployment)
	let deploymentContent = fs.readFileSync(FULL_DEPLOYMENT_TEMPLATE_PATH, "utf8");
	let deploymentCfg: any[] = yaml.loadAll(deploymentContent);

	if (deploymentCfg.length) {
		deploymentCfg.forEach((doc, index) => {
			// Make sure all objects stay in the same namespace:
			if (doc && doc.metadata && doc.metadata.namespace) {
				doc.metadata.namespace = nsName;
			}

			// NAMESPACE
			// if (doc && doc.kind == "Namespace") {
			// 	doc.metadata.name = nsName;
			// 	if (!doc.metadata.labels) doc.metadata.labels = {};
			// 	doc.metadata.labels.project = projectSlug;

			// 	// pre-release
			// 	prereleaseNsDoc = _.cloneDeep(doc);
			// }

			// INGRESS
			if (doc && doc.kind == "Ingress") {
				if (domains.length > 0) {
					const ingCfg = doc;
					ingCfg.metadata.name = ingName;
					ingCfg.metadata.namespace = nsName;

					// inherit config from previous deployment
					if (appConfig.environment[env].shouldInherit) {
						ingCfg.metadata.annotations = {
							...previousIng.metadata.annotations,
							...ingCfg.metadata.annotations,
						};
					}

					if (appConfig.environment[env].ssl == "letsencrypt") {
						ingCfg.metadata.annotations["cert-manager.io/cluster-issuer"] = "letsencrypt-prod";
					}

					// labels
					if (!doc.metadata.labels) doc.metadata.labels = {};
					doc.metadata.labels.project = projectSlug;
					doc.metadata.labels.app = appName;
					doc.metadata.labels["main-app"] = mainAppName;
					doc.metadata.labels.phase = "live";

					// redirect
					if (appConfig.environment[env].redirect) {
						if (!domains.length) {
							logWarn(`Không thể redirect về domain chính nếu không có domain nào ở "${env}" trong dx.json`);
						} else if (domains.length == 1) {
							logWarn(`Không thể redirect về domain chính nếu chỉ có 1 domain ở "${env}" dx.json`);
						} else {
							const otherDomains = domains.slice(1);
							let redirectStr = "";
							otherDomains.map((domain) => {
								redirectStr += `if ($host = '${domain}') {
  rewrite / https://${domains[0]}$request_uri redirect;
}\n`;
							});
							ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/configuration-snippet"] = redirectStr;
						}
					}

					ingCfg.spec.tls = [];
					ingCfg.spec.rules = [];

					domains.map((domain) => {
						// tls
						ingCfg.spec.tls.push({
							hosts: [domain],
							secretName: appConfig.environment[env].tlsSecret,
						});

						// rules
						ingCfg.spec.rules.push({
							host: domain,
							http: {
								paths: [
									{
										path: "/" + basePath,
										pathType: "Prefix",
										backend: {
											service: { name: svcName, port: { number: appConfig.environment[env].port } },
										},
									},
								],
							},
						});
					});

					// delete SSL config if have to:
					if (appConfig.environment[env].ssl == "none") {
						try {
							delete ingCfg.metadata.annotations["cert-manager.io/cluster-issuer"];
							delete ingCfg.spec.tls;
						} catch (e) {}
					}

					// pre-release
					prereleaseIngressDoc = _.cloneDeep(doc);
					prereleaseIngressDoc.metadata.name = "prerelease-" + doc.metadata.name;
					prereleaseIngressDoc.metadata.namespace = nsName;
					prereleaseIngressDoc.metadata.annotations["nginx.ingress.kubernetes.io/configuration-snippet"] = "";
					prereleaseIngressDoc.metadata.annotations["cert-manager.io/cluster-issuer"] = "letsencrypt-prod";
					prereleaseIngressDoc.spec.tls = [
						{
							hosts: [prereleaseDomain],
							secretName: `secret-${_.kebabCase(prereleaseDomain)}`,
						},
					];
					prereleaseIngressDoc.spec.rules = [
						{
							host: prereleaseDomain,
							http: {
								paths: [
									{
										path: "/" + basePath,
										pathType: "Prefix",
										backend: {
											service: { name: prereleaseSvcName, port: { number: appConfig.environment[env].port } },
										},
									},
								],
							},
						},
					];
				} else {
					delete deploymentCfg[index];
					doc = null;
				}
			}

			if (doc && doc.kind == "Service") {
				doc.metadata.name = svcName;

				if (!doc.metadata.labels) doc.metadata.labels = {};
				doc.metadata.labels.project = projectSlug;
				doc.metadata.labels.app = appName;
				doc.metadata.labels["main-app"] = mainAppName;
				doc.metadata.labels.phase = "live";
				doc.spec.selector.app = appName;

				// Routing traffic to the same pod base on ClientIP
				doc.spec.sessionAffinity = "ClientIP";
				doc.spec.ports = [{ port: appConfig.environment[env].port, targetPort: appConfig.environment[env].port }];

				// clone svc to prerelease:
				prereleaseSvcDoc = _.cloneDeep(doc);
				prereleaseSvcDoc.metadata.name = appName;
				prereleaseSvcDoc.metadata.namespace = nsName;
				prereleaseSvcDoc.metadata.labels["main-app"] = mainAppName;
				prereleaseSvcDoc.metadata.labels.app = appName;
				prereleaseSvcDoc.metadata.labels.phase = "prerelease";
				prereleaseSvcDoc.spec.selector.app = appName;
			}

			if (doc && doc.kind == "Deployment") {
				if (env == "dev") {
					// development environment
					doc.spec.template.spec.containers[0].resources = {};
				} else {
					// canary, production, staging,...
					doc.spec.template.spec.containers[0].resources = getContainerResourceBySize(appConfig.environment[env].size || "1x");

					// * Add roll out strategy -> Rolling Update
					doc.spec.strategy = {
						type: "RollingUpdate",
						rollingUpdate: {
							maxSurge: 1,
							maxUnavailable: 1,
						},
					};
				}

				// container replicas
				doc.spec.replicas = replicas;
				doc.metadata.name = appName;

				// tag "live" labels
				if (!doc.metadata.labels) doc.metadata.labels = {};
				doc.metadata.labels.project = projectSlug;
				doc.metadata.labels.app = appName;
				doc.metadata.labels["main-app"] = mainAppName;
				doc.metadata.labels.phase = "live";

				doc.spec.template.metadata.labels.project = projectSlug;
				doc.spec.template.metadata.labels.app = appName;
				doc.spec.template.metadata.labels["main-app"] = mainAppName;
				doc.spec.template.metadata.labels.phase = "live";
				doc.spec.selector.matchLabels.app = appName;

				// container
				doc.spec.template.spec.containers[0].name = appName;

				// Inject "imagePullSecrets" to pull image from the container registry
				doc.spec.template.spec.imagePullSecrets = [{ name: imagePullingSecret.name }];

				doc.spec.template.spec.containers[0].image = IMAGE_NAME;
				doc.spec.template.spec.containers[0].env = containerEnvs;

				// ! PORT 80 sẽ không sử dụng được trên cluster của Digital Ocean
				doc.spec.template.spec.containers[0].ports = [{ containerPort: appConfig.environment[env].port || 3000 }];

				// clone deployment to prerelease:
				prereleaseDeployDoc = _.cloneDeep(doc);
				prereleaseDeployDoc.metadata.namespace = nsName;
				prereleaseDeployDoc.metadata.name = appName;
				prereleaseDeployDoc.metadata.labels.phase = "prerelease";
				prereleaseDeployDoc.metadata.labels["main-app"] = mainAppName;
				prereleaseDeployDoc.metadata.labels.app = appName;
				prereleaseDeployDoc.metadata.labels.project = projectSlug;

				prereleaseDeployDoc.spec.replicas = 1;
				prereleaseDeployDoc.spec.template.metadata.labels.phase = "prerelease";
				prereleaseDeployDoc.spec.template.metadata.labels["main-app"] = mainAppName;
				prereleaseDeployDoc.spec.template.metadata.labels.app = appName;
				prereleaseDeployDoc.spec.template.metadata.labels.project = projectSlug;
				prereleaseDeployDoc.spec.template.spec.containers[0].image = IMAGE_NAME;
				prereleaseDeployDoc.spec.template.spec.containers[0].env = prereleaseEnvs;
				prereleaseDeployDoc.spec.template.spec.containers[0].resources = {};

				// selector
				prereleaseDeployDoc.spec.selector.matchLabels.app = prereleaseAppName;

				// ! no need roll out strategy for prerelease:
				delete prereleaseDeployDoc.spec.strategy;
			}
		});
	} else {
		logError("YAML deployment template is incorrect");
	}

	deploymentContent = objectToDeploymentYaml(deploymentCfg);

	/**
	 * PRE-RELEASE DEPLOYMENT:
	 */
	let prereleaseYamlObject = [prereleaseIngressDoc, prereleaseSvcDoc, prereleaseDeployDoc];
	let prereleaseDeploymentContent = objectToDeploymentYaml(prereleaseYamlObject);

	// Write down the YAML files
	// fs.writeFileSync(DEPLOYMENT_FILE, deploymentContent, "utf8");
	// fs.writeFileSync(path.resolve(DEPLOYMENT_DIR, `deployment.prerelease.yaml`), prereleaseDeploymentContent, "utf8");

	// End point của ứng dụng:
	let endpoint = `https://${domains[0]}/${basePath}`;

	return {
		// namespace
		namespaceContent,
		namespaceObject,
		// deployment (ingress, service, pods,...)
		deploymentContent,
		deploymentCfg,
		// prerelease (ingress, service, pods,...)
		prereleaseYamlObject,
		prereleaseDeploymentContent,
		// accessibility
		BUILD_NUMBER,
		IMAGE_NAME,
		endpoint,
	};
};
