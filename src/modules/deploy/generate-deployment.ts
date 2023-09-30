import { log, logWarn } from "diginext-utils/dist/xconsole/log";
import * as fs from "fs";
import yaml from "js-yaml";
import _, { isEmpty, isObject, toNumber } from "lodash";

import { getContainerResourceBySize } from "@/config/config";
import { DIGINEXT_DOMAIN, FULL_DEPLOYMENT_TEMPLATE_PATH, NAMESPACE_TEMPLATE_PATH } from "@/config/const";
import type { IContainerRegistry, IWorkspace } from "@/entities";
import type { AppConfig, DeployEnvironment, KubeDeployment, KubeNamespace } from "@/interfaces";
import type { KubeIngress } from "@/interfaces/KubeIngress";
import { objectToDeploymentYaml } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

import { getAppConfigFromApp } from "../apps/app-helper";
import ClusterManager from "../k8s";
import { createImagePullSecretsInNamespace } from "../k8s/image-pull-secret";
import getDeploymentName from "./generate-deployment-name";
import { generateDomains } from "./generate-domain";

export type GenerateDeploymentParams = {
	appSlug: string;
	env: string;
	username: string;
	workspace: IWorkspace;
	/**
	 * Requires if generate deployment files from image URL.
	 */
	appConfig?: AppConfig;
	/**
	 * Requires if generate deployment files from source code.
	 */
	targetDirectory?: string;
	/**
	 * Requires if generate deployment files from source code.
	 */
	buildTag?: string;
	// debug
	isDebugging?: boolean;
};

export type GenerateDeploymentResult = {
	// namespace
	namespaceContent: string;
	namespaceObject: KubeNamespace;
	// deployment (ingress, service, pods,...)
	deploymentContent: string;
	deploymentCfg: KubeDeployment;
	// prerelease (ingress, service, pods,...)
	prereleaseYamlObject: any[];
	prereleaseDeploymentContent: string;
	// accessibility
	buildTag: string;
	IMAGE_NAME: string;
	endpoint: string;
	prereleaseUrl: string;
};

export const generateDeployment = async (params: GenerateDeploymentParams) => {
	const { appSlug, buildTag, env = "dev", username, workspace, appConfig } = params;

	// validate inputs
	if (!appSlug) throw new Error(`Unable to generate YAML, app's slug is required.`);
	if (!buildTag) throw new Error(`Unable to generate YAML, build number is required.`);

	const { DB } = await import("@/modules/api/DB");
	const app = await DB.findOne("app", { slug: appSlug }, { populate: ["project", "workspace", "owner"] });
	const currentAppConfig = appConfig || getAppConfigFromApp(app);

	// console.log("generateDeployment() > currentAppConfig :>> ", currentAppConfig);

	// DEFINE DEPLOYMENT PARTS:
	if (params.isDebugging) console.log("generateDeployment() > buildTag :>> ", buildTag);

	const deployEnvironmentConfig = currentAppConfig.deployEnvironment[env];
	// console.log("generateDeployment() > deployEnvironmentConfig :>> ", deployEnvironmentConfig);

	const registrySlug = deployEnvironmentConfig.registry;

	// let deploymentName = project + "-" + appSlug.toLowerCase();
	let deploymentName = await getDeploymentName(app);

	let nsName = deployEnvironmentConfig.namespace;
	let ingName = deploymentName;
	let svcName = deploymentName;
	let mainAppName = deploymentName;
	let appName = deploymentName + "-" + (app.buildNumber ?? 1);
	let basePath = deployEnvironmentConfig.basePath ?? "";

	// Prepare for building docker image
	const { imageURL } = deployEnvironmentConfig;

	// TODO: Replace BUILD_NUMBER so it can work with Skaffold
	const IMAGE_NAME = `${imageURL}:${buildTag}`;

	let projectSlug = currentAppConfig.project;
	let domains = deployEnvironmentConfig.domains;
	let replicas = deployEnvironmentConfig.replicas ?? 1;

	const BASE_URL = domains && domains.length > 0 ? `https://${domains[0]}` : `http://${svcName}.${nsName}.svc.cluster.local`;
	const clusterSlug = deployEnvironmentConfig.cluster;

	// get container registry
	let registry: IContainerRegistry = await DB.findOne("registry", { slug: registrySlug });
	if (!registry) {
		throw new Error(`Cannot find any container registries with slug as "${registrySlug}", please contact your admin or create a new one.`);
	}
	if (!registry.imagePullSecret) {
		const imagePullSecret = await createImagePullSecretsInNamespace(appSlug, env, clusterSlug, nsName);
		[registry] = await DB.update("registry", { _id: registry._id }, { imagePullSecret });
	}
	// console.log("registry :>> ", registry);

	// get destination cluster
	let cluster = await DB.findOne("cluster", { slug: clusterSlug });
	if (!cluster) {
		throw new Error(`Cannot find any clusters with short name as "${clusterSlug}", please contact your admin or create a new one.`);
	}
	const { contextName: context } = cluster;

	// get registry secret as image pulling secret:
	const { imagePullSecret } = registry;

	// prerelease:
	const prereleaseSubdomainName = `${appSlug.toLowerCase()}.prerelease`;
	let prereleaseIngName = `prerelease-${ingName}`;
	let prereleaseSvcName = `prerelease-${svcName}`;
	let prereleaseAppName = `prerelease-${appName}`;
	let prereleaseIngressDoc, prereleaseSvcDoc, prereleaseDeployDoc;
	let prereleaseDomain: string;

	// Setup a domain for prerelease
	if (env == "prod") {
		const { status, domain, messages } = await generateDomains({
			workspace,
			primaryDomain: DIGINEXT_DOMAIN,
			subdomainName: prereleaseSubdomainName,
			clusterSlug: deployEnvironmentConfig.cluster,
		});
		if (status === 0) {
			throw new Error(`Can't create "prerelease" domain: ${domain} because "${messages.join(". ")}"`);
		}
		prereleaseDomain = domain;
	}
	if (env === "prod") log({ prereleaseDomain });

	// * [NEW TACTIC] Fetch ENV variables from database:
	const deployEnvironment = app.deployEnvironment[env] || ({} as DeployEnvironment);
	// console.log("generate deployment > deployEnvironment :>> ", deployEnvironment);

	let containerEnvs = deployEnvironment.envVars || [];
	// console.log("[1] containerEnvs :>> ", containerEnvs);

	// FIXME: magic?
	if (isObject(containerEnvs)) containerEnvs = Object.entries(containerEnvs).map(([key, val]) => val);

	// kubernetes YAML only accept string as env variable value
	containerEnvs = containerEnvs.map(({ name, value }) => {
		let valueStr: string;
		// try to cast {Object} to {string}
		try {
			valueStr = JSON.stringify(value);
		} catch (e: any) {}

		return { name, value: valueStr ?? value.toString() };
	});

	// console.log("[2] containerEnvs :>> ", containerEnvs);

	// prerelease ENV variables (is the same with PROD ENV variables, except the domains/origins if any):
	let prereleaseEnvs = [];
	if (env === "prod" && !isEmpty(domains)) {
		prereleaseEnvs = containerEnvs.map((envVar) => {
			let curValue = envVar.value;
			if (curValue.indexOf(domains[0]) > -1) {
				// replace all production domains with PRERELEASE domains
				envVar.value = (curValue || "").replace(new RegExp(domains[0], "gi"), prereleaseDomain);
			}
			return { ...envVar };
		});
	}
	// console.log("[3] prereleaseEnvs :>> ", prereleaseEnvs);

	// Should inherit the "Ingress" config from the previous deployment?
	let previousDeployment,
		previousIng: KubeIngress = { metadata: { annotations: {} } };

	if (deployEnvironmentConfig.shouldInherit && deployEnvironment && deployEnvironment.deploymentYaml) {
		try {
			previousDeployment = yaml.loadAll(deployEnvironment.deploymentYaml);
			previousDeployment.map((doc, index) => {
				if (doc && doc.kind == "Ingress") previousIng = doc;
			});
		} catch (e) {
			logWarn(e);
		}
	}

	// get available ingress class
	const ingressClasses = (await ClusterManager.getIngressClasses({ context })) || [];

	// write namespace.[env].yaml
	let namespaceContent = fs.readFileSync(NAMESPACE_TEMPLATE_PATH, "utf8");

	let namespaceObject = yaml.load(namespaceContent);
	namespaceObject.metadata.name = nsName;
	namespaceObject.metadata.labels = namespaceObject.metadata.labels || {};
	namespaceObject.metadata.labels.project = projectSlug.toLowerCase();
	namespaceObject.metadata.labels.owner = username.toLowerCase();
	namespaceObject.metadata.labels.workspace = workspace.slug.toLowerCase();

	namespaceContent = objectToDeploymentYaml(namespaceObject);

	// write deployment.[env].yaml (ing, svc, deployment)
	let deploymentContent = fs.readFileSync(FULL_DEPLOYMENT_TEMPLATE_PATH, "utf8");
	let deploymentCfg: any[] = yaml.loadAll(deploymentContent);

	if (deploymentCfg.length) {
		deploymentCfg.forEach((doc, index) => {
			// Make sure all objects stay in the same namespace:
			if (doc && doc.metadata && doc.metadata.namespace) {
				doc.metadata.namespace = nsName;
			}

			// INGRESS
			if (doc && doc.kind == "Ingress") {
				if (domains.length > 0) {
					const ingCfg = doc;
					ingCfg.metadata.name = ingName;
					ingCfg.metadata.namespace = nsName;

					// inherit config from previous deployment
					if (deployEnvironmentConfig.shouldInherit) {
						ingCfg.metadata.annotations = {
							...previousIng.metadata.annotations,
							...ingCfg.metadata.annotations,
						};
					}

					if (deployEnvironmentConfig.ssl == "letsencrypt") {
						ingCfg.metadata.annotations["cert-manager.io/cluster-issuer"] = "letsencrypt-prod";
					} else {
						ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/ssl-redirect"] = "false";
					}

					// ingress class
					let ingressClass = "";
					if (
						deployEnvironmentConfig.ingress &&
						ingressClasses.map((ingClass) => ingClass.metadata?.name).includes(deployEnvironmentConfig.ingress)
					) {
						ingressClass = deployEnvironmentConfig.ingress;
					} else {
						ingressClass = ingressClasses[0].metadata.name;
					}
					if (ingressClass) ingCfg.metadata.annotations["kubernetes.io/ingress.class"] = ingressClass;

					// requests per minute
					if (ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/limit-rpm"])
						delete ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/limit-rpm"];
					if (env !== "prod") ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/limit-rps"] = `100`;

					// labels
					if (!doc.metadata.labels) doc.metadata.labels = {};
					doc.metadata.labels.workspace = workspace.slug;
					doc.metadata.labels["updated-by"] = username;
					doc.metadata.labels.project = projectSlug;
					doc.metadata.labels.app = appName;
					doc.metadata.labels["main-app"] = mainAppName;
					doc.metadata.labels.phase = "live";

					// redirect
					if (deployEnvironmentConfig.redirect) {
						if (!domains.length) {
							logWarn(`Can't redirect to primary domain if there are no domains in "${env}" deploy environment`);
						} else if (domains.length == 1) {
							logWarn(`Can't redirect to primary domain if there is only 1 domain in "${env}" deploy environment`);
						} else {
							const otherDomains = domains.slice(1);
							let redirectStr = "";
							otherDomains.map((domain) => {
								redirectStr += `if ($host = '${domain}') {\n`;
								redirectStr += `  rewrite / https://${domains[0]}$request_uri redirect;\n`;
								redirectStr += `}\n`;
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
							secretName: deployEnvironmentConfig.tlsSecret || `tls-secret-letsencrypt-${makeSlug(domain)}`,
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
											service: { name: svcName, port: { number: deployEnvironmentConfig.port } },
										},
									},
								],
							},
						});
					});

					// delete SSL config if have to:
					if (deployEnvironmentConfig.ssl == "none") {
						try {
							delete ingCfg.metadata.annotations["cert-manager.io/cluster-issuer"];
							delete ingCfg.spec.tls;
						} catch (e) {}
					}

					// pre-release
					prereleaseIngressDoc = _.cloneDeep(doc);
					prereleaseIngressDoc.metadata.name = prereleaseIngName;
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
											service: { name: prereleaseSvcName, port: { number: deployEnvironmentConfig.port } },
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
				doc.metadata.labels.workspace = workspace.slug;
				doc.metadata.labels["updated-by"] = username;
				doc.metadata.labels.project = projectSlug;
				doc.metadata.labels.app = appName;
				doc.metadata.labels["main-app"] = mainAppName;
				doc.metadata.labels.phase = "live";
				doc.spec.selector.app = appName;

				// Routing traffic to the same pod base on ClientIP
				doc.spec.sessionAffinity = "ClientIP";
				doc.spec.ports = [{ port: deployEnvironmentConfig.port, targetPort: deployEnvironmentConfig.port }];

				// clone svc to prerelease:
				prereleaseSvcDoc = _.cloneDeep(doc);
				prereleaseSvcDoc.metadata.name = prereleaseSvcName;
				prereleaseSvcDoc.metadata.namespace = nsName;
				prereleaseSvcDoc.metadata.labels["main-app"] = mainAppName;
				prereleaseSvcDoc.metadata.labels.app = appName;
				prereleaseSvcDoc.metadata.labels.phase = "prerelease";
				prereleaseSvcDoc.spec.selector.app = prereleaseAppName;
			}

			if (doc && doc.kind == "Deployment") {
				if (env == "dev") {
					// development environment
					doc.spec.template.spec.containers[0].resources = {};
				} else {
					// canary, production, staging,...
					doc.spec.template.spec.containers[0].resources = getContainerResourceBySize(deployEnvironmentConfig.size || "1x");

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

				// deployment's labels
				if (!doc.metadata.labels) doc.metadata.labels = {};
				doc.metadata.labels.workspace = workspace.slug;
				doc.metadata.labels["updated-by"] = username;
				doc.metadata.labels.project = projectSlug;
				doc.metadata.labels.app = appName;
				doc.metadata.labels["main-app"] = mainAppName;
				doc.metadata.labels.phase = "live";

				// pod's labels
				doc.spec.template.metadata.labels.workspace = workspace.slug;
				doc.spec.template.metadata.labels["updated-by"] = username;
				doc.spec.template.metadata.labels.project = projectSlug;
				doc.spec.template.metadata.labels.app = appName;
				doc.spec.template.metadata.labels["main-app"] = mainAppName;
				doc.spec.template.metadata.labels.phase = "live";
				doc.spec.selector.matchLabels.app = appName;

				// container
				doc.spec.template.spec.containers[0].name = appName;

				// Inject "imagePullSecrets" to pull image from the container registry
				doc.spec.template.spec.imagePullSecrets = [{ name: imagePullSecret.name }];

				doc.spec.template.spec.containers[0].image = IMAGE_NAME;
				doc.spec.template.spec.containers[0].env = containerEnvs;

				// ! PORT 80 sẽ không sử dụng được trên cluster của Digital Ocean
				doc.spec.template.spec.containers[0].ports = [{ containerPort: toNumber(deployEnvironmentConfig.port) }];

				// prerelease's deployment:
				prereleaseDeployDoc = _.cloneDeep(doc);
				prereleaseDeployDoc.metadata.namespace = nsName;
				prereleaseDeployDoc.metadata.name = prereleaseAppName;
				prereleaseDeployDoc.metadata.labels.phase = "prerelease";
				prereleaseDeployDoc.metadata.labels["main-app"] = mainAppName;
				prereleaseDeployDoc.metadata.labels.app = prereleaseAppName;
				prereleaseDeployDoc.metadata.labels.project = projectSlug;
				prereleaseDeployDoc.metadata.labels.workspace = workspace.slug;
				prereleaseDeployDoc.metadata.labels["updated-by"] = username;

				prereleaseDeployDoc.spec.replicas = 1;
				prereleaseDeployDoc.spec.template.metadata.labels.phase = "prerelease";
				prereleaseDeployDoc.spec.template.metadata.labels["main-app"] = mainAppName;
				prereleaseDeployDoc.spec.template.metadata.labels.app = prereleaseAppName;
				prereleaseDeployDoc.spec.template.metadata.labels.project = projectSlug;
				prereleaseDeployDoc.spec.template.metadata.labels.workspace = workspace.slug;
				prereleaseDeployDoc.spec.template.metadata.labels["updated-by"] = username;
				prereleaseDeployDoc.spec.template.spec.containers[0].image = IMAGE_NAME;
				prereleaseDeployDoc.spec.template.spec.containers[0].env = prereleaseEnvs;
				prereleaseDeployDoc.spec.template.spec.containers[0].resources = {};

				// prerelease's app selector
				prereleaseDeployDoc.spec.selector.matchLabels.app = prereleaseAppName;

				// ! no need roll out strategy for prerelease:
				delete prereleaseDeployDoc.spec.strategy;
			}
		});
	} else {
		throw new Error("YAML deployment template is incorrect");
	}

	deploymentContent = objectToDeploymentYaml(deploymentCfg);

	/**
	 * PRE-RELEASE DEPLOYMENT:
	 */
	let prereleaseYamlObject = [prereleaseIngressDoc, prereleaseSvcDoc, prereleaseDeployDoc];
	let prereleaseDeploymentContent = objectToDeploymentYaml(prereleaseYamlObject);

	// End point của ứng dụng:
	let endpoint = `https://${domains[0]}/${basePath}`;
	const prereleaseUrl = `https://${prereleaseDomain}/${basePath}`;

	return {
		envVars: containerEnvs,
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
		buildTag: buildTag,
		IMAGE_NAME,
		endpoint,
		prereleaseUrl,
	} as GenerateDeploymentResult;
};
