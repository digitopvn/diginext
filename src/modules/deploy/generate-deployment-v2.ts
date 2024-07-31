import type { V1PersistentVolumeClaim } from "@kubernetes/client-node";
import { logWarn } from "diginext-utils/dist/xconsole/log";
import * as fs from "fs";
import yaml from "js-yaml";
import { isObject, toNumber } from "lodash";

import { getContainerResourceBySize } from "@/config/config";
import { FULL_DEPLOYMENT_TEMPLATE_PATH, NAMESPACE_TEMPLATE_PATH } from "@/config/const";
import type { IContainerRegistry, IUser, IWorkspace } from "@/entities";
import type { AppConfig, DeployEnvironment, KubeDeployment, KubeNamespace } from "@/interfaces";
import type { KubeIngress } from "@/interfaces/KubeIngress";
import { objectToDeploymentYaml } from "@/plugins";
import { formatEnvVars } from "@/plugins/env-var";
import { makeSlug } from "@/plugins/slug";

import { getAppConfigFromApp } from "../apps/app-helper";
import { diginextDomainName } from "../build";
import ClusterManager from "../k8s";
import { createImagePullSecretsInNamespace } from "../k8s/image-pull-secret";
import getDeploymentName from "./generate-deployment-name";
import { generateDomains } from "./generate-domain";

export type GenerateDeploymentV2Params = {
	appSlug: string;
	env: string;
	port?: number;
	username: string;
	workspace: IWorkspace;
	/**
	 * Skip replacing origin domain of "prerelease" environment.
	 *
	 * @default false
	 * @deprecated
	 */
	skipPrerelease?: boolean;
	/**
	 * Requires if generate deployment files from image URL.
	 */
	appConfig?: AppConfig;
	/**
	 * Requires if generate deployment files from source code.
	 */
	targetDirectory?: string;
	/**
	 * Image URL of a build on container registry (no tag/version)
	 */
	buildImage?: string;
	/**
	 * Requires if generate deployment files from source code.
	 */
	buildTag?: string;
	/**
	 * Container Registry
	 */
	registry?: IContainerRegistry;
	// debug
	isDebugging?: boolean;
};

export type GenerateDeploymentV2Result = {
	// namespace
	namespaceContent: string;
	namespaceObject: KubeNamespace;

	// deployment (ingress, service, pods,...)
	deploymentName: string;
	deployEnvironment: DeployEnvironment;
	deploymentContent: string;
	deploymentCfg: KubeDeployment;

	// accessibility
	buildTag: string;
	buildNumber: number;
	IMAGE_NAME: string;
	endpoint: string;
};

const nginxBlockedPaths = "location ~ /.git { deny all; return 403; }";

export const generateDeploymentV2 = async (params: GenerateDeploymentV2Params) => {
	const {
		appSlug,
		buildTag,
		buildImage,
		env = "dev",
		port,
		skipPrerelease = false,
		username,
		workspace,
		appConfig,
		registry: inputRegistry,
	} = params;

	// validate inputs
	if (!appSlug) throw new Error(`Unable to generate YAML, app's slug is required.`);
	if (!buildTag) throw new Error(`Unable to generate YAML, build number is required.`);

	const { DB } = await import("@/modules/api/DB");
	const app = await DB.findOne("app", { slug: appSlug }, { populate: ["project", "workspace", "owner"] });
	const currentAppConfig = appConfig || getAppConfigFromApp(app);
	let appOwner = app.ownerSlug;
	if (!appOwner) {
		appOwner = (app.owner as IUser).slug;
		await DB.updateOne("app", { slug: appSlug }, { ownerSlug: appOwner }).catch((e) =>
			console.error(`Unable to update "appOwner" to "${appSlug}" app.`)
		);
	}

	let projectSlug = currentAppConfig.project;
	if (!projectSlug)
		throw new Error(`Unable to generate YAML, a "project" (slug) param in "${env}" deploy environment of "${appSlug}" is required.`);

	// DEFINE DEPLOYMENT PARTS:
	if (params.isDebugging) console.log("generateDeploymentV2() > buildTag :>> ", buildTag);

	const deployEnvironmentConfig = currentAppConfig.deployEnvironment[env];

	let deploymentName = await getDeploymentName(app);
	let nsName = deployEnvironmentConfig.namespace || `${projectSlug}-${env}`;
	let ingName = deploymentName;
	let svcName = deploymentName;
	let mainAppName = deploymentName;
	let buildNumber = app.buildNumber ?? 1;
	let appVersion = deploymentName + "-" + buildNumber;
	let basePath = deployEnvironmentConfig.basePath ?? "";

	// Overwrite exposed port
	if (typeof port !== "undefined") deployEnvironmentConfig.port = port;
	if (typeof deployEnvironmentConfig.port === "undefined") throw new Error(`Unable to generate deployment YAML, port is required.`);

	const clusterSlug = deployEnvironmentConfig.cluster;

	// Prepare for building docker image
	let IMAGE_NAME = buildImage ? `${buildImage}:${buildTag}` : undefined;
	if (!IMAGE_NAME && deployEnvironmentConfig.imageURL) IMAGE_NAME = `${deployEnvironmentConfig.imageURL}:${buildTag}`;
	if (!IMAGE_NAME) throw new Error(`Unable to generate deployment YAML, image name (image url + tag) is required.`);
	deployEnvironmentConfig.imageURL = buildImage;

	let domains = deployEnvironmentConfig.domains;
	let replicas = deployEnvironmentConfig.replicas ?? 1;

	// if no domains, generate a default DIGINEXT domain:
	if (!domains) {
		const user = await DB.findOne("user", { slug: username });
		const { subdomain } = await diginextDomainName(env, projectSlug, appSlug);
		const {
			status,
			domain: generatedDomain,
			messages,
		} = await generateDomains({
			user,
			workspace,
			subdomainName: subdomain,
			clusterSlug: clusterSlug,
			isDebugging: true,
		});
		if (!status) throw new Error(messages.join("\n"));
		deployEnvironmentConfig.domains = domains = [generatedDomain];
		deployEnvironmentConfig.ssl = "letsencrypt";
	}

	const BASE_URL = domains && domains.length > 0 ? `https://${domains[0]}` : `http://${svcName}.${nsName}.svc.cluster.local`;

	// get container registry & create "imagePullSecret" in the target cluster
	let registry: IContainerRegistry =
		inputRegistry || (deployEnvironmentConfig.registry ? await DB.findOne("registry", { slug: deployEnvironmentConfig.registry }) : undefined);
	if (!registry) throw new Error(`Container registries not found, please contact your admin or create a new one.`);
	deployEnvironmentConfig.registry = registry.slug;

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

	// * [NEW TACTIC] Fetch ENV variables from database:
	const deployEnvironment = app.deployEnvironment[env] || ({} as DeployEnvironment);
	// console.log("generate deployment > deployEnvironment :>> ", deployEnvironment);

	let containerEnvs = deployEnvironment.envVars || [];
	// console.log("[1] containerEnvs :>> ", containerEnvs);

	// FIXME: magic?
	if (isObject(containerEnvs)) containerEnvs = Object.entries(containerEnvs).map(([key, val]) => val);

	// kubernetes YAML only accept string as env variable value
	containerEnvs = formatEnvVars(containerEnvs);

	// console.log("[2] containerEnvs :>> ", containerEnvs);

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
			logWarn(`Unable to parse previous deployment YAML:`, e, `\n=> Previous YAML:\n`, deployEnvironment.deploymentYaml);
		}
	}

	// assign labels
	const labels: any = {};
	labels.workspace = workspace.slug;
	labels.owner = appOwner;
	labels["updated-by"] = username;
	labels.project = projectSlug;
	labels.app = mainAppName;
	labels["main-app"] = mainAppName;
	labels["app-version"] = appVersion;
	labels["deploy-strategy"] = "v2";

	// get available ingress class
	const ingressClasses = (await ClusterManager.getIngressClasses({ context })) || [];

	// write namespace.[env].yaml
	if (!fs.existsSync(NAMESPACE_TEMPLATE_PATH)) throw new Error(`Namespace template not found: "${NAMESPACE_TEMPLATE_PATH}"`);
	let namespaceContent = fs.readFileSync(NAMESPACE_TEMPLATE_PATH, "utf8");
	let namespaceObject = (yaml.load(namespaceContent) || {}) as any;
	if (params.isDebugging) console.log("Generate deployment > namespace > template YAML :>> ", namespaceContent);
	namespaceObject.metadata.name = nsName;
	namespaceObject.metadata.labels = namespaceObject.metadata?.labels || {};
	namespaceObject.metadata.labels.project = projectSlug.toLowerCase();
	namespaceObject.metadata.labels.owner = appOwner.toLowerCase();
	namespaceObject.metadata.labels.workspace = workspace.slug.toLowerCase();

	namespaceContent = objectToDeploymentYaml(namespaceObject);
	if (params.isDebugging) console.log("Generate deployment > namespace > final YAML :>> ", namespaceContent);

	// write deployment.[env].yaml (ing, svc, deployment)
	let deploymentContent = fs.readFileSync(FULL_DEPLOYMENT_TEMPLATE_PATH, "utf8");
	let deploymentCfg: any[] = yaml.loadAll(deploymentContent);

	// console.log("app.deployEnvironment :>> ", app.deployEnvironment);
	// console.log("app.deployEnvironment[env].volumes :>> ", app.deployEnvironment[env].volumes);

	if (deploymentCfg.length) {
		deploymentCfg.forEach((doc, index) => {
			// Make sure all objects stay in the same namespace:
			if (doc && doc.metadata && doc.metadata.namespace) doc.metadata.namespace = nsName;

			// INGRESS
			if (doc && doc.kind == "Ingress") {
				if (domains.length > 0) {
					const ingCfg = doc;
					if (ingCfg.metadata) ingCfg.metadata = {};
					ingCfg.metadata.name = ingName;
					ingCfg.metadata.namespace = nsName;

					// inherit config from previous deployment
					if (deployEnvironmentConfig.shouldInherit) {
						ingCfg.metadata.annotations = {
							...previousIng?.metadata.annotations,
							...ingCfg.metadata.annotations,
						};
					}

					if (!ingCfg.metadata.annotations) ingCfg.metadata.annotations = {};
					if (deployEnvironmentConfig.ssl == "letsencrypt") {
						ingCfg.metadata.annotations["cert-manager.io/cluster-issuer"] = "letsencrypt-prod";
					} else {
						ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/ssl-redirect"] = "false";
					}

					// ingress class
					const ingressClass = ingressClasses[0] && ingressClasses[0].metadata ? ingressClasses[0].metadata.name : undefined;
					if (ingressClass) {
						// ! OLD -> DEPRECATED!!!
						delete ingCfg.metadata.annotations["kubernetes.io/ingress.class"];
						// ! NEW -> WORKING!!!
						ingCfg.spec.ingressClassName = ingressClass;
					}

					// block some specific paths
					ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/server-snippet"] = nginxBlockedPaths;

					// limit file upload & body size
					ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/proxy-body-size"] = "100m";

					// limit requests per minute (DEV ONLY)
					if (ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/limit-rpm"])
						delete ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/limit-rpm"];
					if (env !== "prod") ingCfg.metadata.annotations["nginx.ingress.kubernetes.io/limit-rps"] = `200`;

					// labels
					doc.metadata.labels = labels;
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
							secretName: deployEnvironmentConfig.tlsSecret || `tls-${makeSlug(domain)}`,
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
				} else {
					delete deploymentCfg[index];
					doc = null;
				}
			}

			if (doc && doc.kind == "Service") {
				doc.metadata.name = svcName;

				// labels
				doc.metadata.labels = labels;
				doc.metadata.labels.phase = "live";
				doc.spec.selector.app = mainAppName;

				// Routing traffic to the same pod base on ClientIP
				doc.spec.sessionAffinity = "ClientIP";
				doc.spec.ports = [{ port: deployEnvironmentConfig.port, targetPort: deployEnvironmentConfig.port }];
			}

			if (doc && doc.kind == "Deployment") {
				if (env == "dev") {
					// development environment
					doc.spec.template.spec.containers[0].resources = {};
				} else {
					// canary, production, staging,...
					doc.spec.template.spec.containers[0].resources = getContainerResourceBySize(deployEnvironmentConfig.size || "1x");
				}

				// minimum number of seconds for which a newly created Pod should be ready without any of its containers crashing
				doc.spec.minReadySeconds = 10;

				// * Add roll out strategy -> Rolling Update
				doc.spec.strategy = {
					type: "RollingUpdate",
					rollingUpdate: {
						maxSurge: 1,
						maxUnavailable: 1,
					},
				};

				// container replicas
				doc.spec.replicas = replicas;
				// doc.metadata.name = appName;
				doc.metadata.name = mainAppName;

				// deployment's labels
				doc.metadata.labels = labels;
				doc.metadata.labels.phase = "live";

				// pod's labels
				doc.spec.template.metadata.labels = labels;
				doc.spec.template.metadata.labels.phase = "live";
				// doc.spec.selector.matchLabels.app = appName;
				doc.spec.selector.matchLabels.app = mainAppName;

				// Inject "imagePullSecrets" to pull image from the container registry
				doc.spec.template.spec.imagePullSecrets = [{ name: imagePullSecret.name }];

				// container
				// doc.spec.template.spec.containers[0].name = appName;
				doc.spec.template.spec.containers[0].name = mainAppName;

				doc.spec.template.spec.containers[0].image = IMAGE_NAME;
				doc.spec.template.spec.containers[0].env = containerEnvs;

				// NOTE: PORT 80 có thể không sử dụng được trên cluster của Digital Ocean
				doc.spec.template.spec.containers[0].ports = [{ containerPort: toNumber(deployEnvironmentConfig.port) }];

				// readinginessProbe & livenessProbe
				// RUNNING: Sometimes, applications are temporarily unable to serve traffic
				doc.spec.template.spec.containers[0].readinessProbe = {
					httpGet: {
						path: "/",
						port: toNumber(deployEnvironmentConfig.port),
					},
					initialDelaySeconds: 30,
					timeoutSeconds: 2,
					periodSeconds: 15,
					successThreshold: 1,
					failureThreshold: 3,
				};
				// STARTUP: The application is considered unhealthy after a certain number of consecutive failures
				doc.spec.template.spec.containers[0].livenessProbe = {
					httpGet: {
						path: "/",
						port: toNumber(deployEnvironmentConfig.port),
					},
					initialDelaySeconds: 30, // chờ 30s rồi mới bắt đầu check
					timeoutSeconds: 2,
					periodSeconds: 10, // check lại mỗi 10s
					successThreshold: 1, // chỉ cần 1 lần success -> app is ready
					failureThreshold: 30, // check 30 lần fail x 10s = 300s (5 phút)
				};

				// add persistent volumes (IF ANY)
				if (app.deployEnvironment[env].volumes && app.deployEnvironment[env].volumes.length > 0) {
					const { volumes } = app.deployEnvironment[env];
					let nodeName = volumes[0].node;
					// persistent volume claim
					doc.spec.template.spec.volumes = volumes.map((vol) => {
						switch (vol.type) {
							case "pvc":
								return { name: vol.name, persistentVolumeClaim: { claimName: vol.name } };

							case "host-path":
							default:
								return { name: vol.name, hostPath: { path: vol.hostPath, type: "DirectoryOrCreate" } };
						}
					});

					// mount to container
					doc.spec.template.spec.containers[0].volumeMounts = volumes.map((vol) => ({
						name: vol.name,
						mountPath: vol.mountPath,
					}));

					// "nodeAffinity" -> to make sure pods are scheduled to the same node with the persistent volume
					doc.spec.template.spec.affinity = {
						nodeAffinity: {
							requiredDuringSchedulingIgnoredDuringExecution: {
								nodeSelectorTerms: [
									{
										matchExpressions: [
											{
												key: "kubernetes.io/hostname",
												operator: "In",
												values: [nodeName],
											},
										],
									},
								],
							},
						},
					};
				}
			}
		});
	} else {
		throw new Error("YAML deployment template is incorrect");
	}

	// add persistent volumes if needed
	if (app.deployEnvironment[env].volumes && app.deployEnvironment[env].volumes.length > 0) {
		const { volumes } = app.deployEnvironment[env];

		// get storage class name
		const allStorageClasses = await ClusterManager.getAllStorageClasses({ context: cluster.contextName });
		if (!allStorageClasses || allStorageClasses.length === 0)
			throw new Error(`Unable to create volume, this cluster doesn't have any storage class.`);
		const storageClass = allStorageClasses[0].metadata.name;

		volumes.forEach((vol) => {
			// persistent volume claim
			const persistentVolumeClaim: V1PersistentVolumeClaim = {
				apiVersion: "v1",
				kind: "PersistentVolumeClaim",
				metadata: {
					name: vol.name,
					namespace: nsName,
					labels,
				},
				spec: {
					storageClassName: storageClass,
					resources: {
						requests: { storage: vol.size },
					},
					accessModes: ["ReadWriteOnce"],
				},
			};
			deploymentCfg.push(persistentVolumeClaim);
		});
	}

	deploymentContent = objectToDeploymentYaml(deploymentCfg);

	console.log("deploymentContent :>> ", deploymentContent);

	// End point của ứng dụng:
	let endpoint = `https://${domains[0]}/${basePath}`;

	// update deploy environment
	// const updatedApp = await DB.updateOne("app", { _id: app._id }, { [`deployEnvironment.${env}`]: deployEnvironmentConfig });

	return {
		envVars: containerEnvs,
		// namespace
		namespaceContent,
		namespaceObject,
		// deployment (ingress, service, pods,...)
		deploymentName,
		deployEnvironment: deployEnvironmentConfig as DeployEnvironment,
		deploymentContent,
		deploymentCfg,
		// prerelease (ingress, service, pods,...)
		// prereleaseYamlObject,
		// prereleaseDeploymentContent,
		// prereleaseUrl,
		// accessibility
		buildTag,
		buildNumber,
		IMAGE_NAME,
		endpoint,
	} as GenerateDeploymentV2Result;
};
