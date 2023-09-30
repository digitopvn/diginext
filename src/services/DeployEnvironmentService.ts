import { isJSON } from "class-validator";
import { makeSlug } from "diginext-utils/dist/Slug";
import { logWarn } from "diginext-utils/dist/xconsole/log";
import { isArray, isBoolean, isEmpty, isObject, isUndefined, toString } from "lodash";
import type { QuerySelector } from "mongoose";

import type { ICluster, IProject, IUser, IWorkspace } from "@/entities";
import type { IApp } from "@/entities/App";
import type { IQueryOptions } from "@/interfaces";
import { type DeployEnvironment, type KubeDeployment } from "@/interfaces";
import type { DeployEnvironmentData } from "@/interfaces/AppInterfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { Ownership } from "@/interfaces/SystemTypes";
import { sslIssuerList } from "@/interfaces/SystemTypes";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import { getDeployEvironmentByApp } from "@/modules/apps/get-app-environment";
import { createReleaseFromApp } from "@/modules/build/create-release-from-app";
import type { GenerateDeploymentResult } from "@/modules/deploy";
import { generateDeployment } from "@/modules/deploy";
import getDeploymentName from "@/modules/deploy/generate-deployment-name";
import { dxCreateDomain } from "@/modules/diginext/dx-domain";
import ClusterManager from "@/modules/k8s";
import { checkQuota } from "@/modules/workspace/check-quota";
import { currentVersion } from "@/plugins";

export type DeployEnvironmentApp = DeployEnvironment & {
	app: IApp;
	appSlug: string;
	cluster: ICluster;
};

export type KubeDeploymentOnCluster = KubeDeployment & {
	cluster: ICluster;
};

export class DeployEnvironmentService {
	/**
	 * Current login user
	 */
	user?: IUser;

	/**
	 * Current active workspace
	 */
	workspace?: IWorkspace;

	/**
	 * Current owner & workspace
	 */
	ownership?: Ownership;

	constructor(ownership?: Ownership) {
		this.ownership = ownership;
		this.user = ownership?.owner;
		this.workspace = ownership?.workspace;
	}

	async createDeployEnvironment(
		appSlug: string,
		params: {
			/**
			 * `REQUIRES`
			 * ---
			 * Deploy environment name
			 * @default dev
			 */
			env: string;
			/**
			 * `REQUIRES`
			 * ---
			 * Deploy environment configuration
			 */
			deployEnvironmentData: DeployEnvironmentData;
		},
		ownership: Ownership
	) {
		// conversion if needed...
		if (isJSON(params.deployEnvironmentData))
			params.deployEnvironmentData = JSON.parse(params.deployEnvironmentData as unknown as string) as DeployEnvironmentData;

		//
		const { env, deployEnvironmentData } = params;
		if (!appSlug) throw new Error(`App slug is required.`);
		if (!env) throw new Error(`Deploy environment name is required.`);
		if (!deployEnvironmentData) throw new Error(`Deploy environment configuration is required.`);

		const { AppService, ClusterService, ContainerRegistryService } = await import("./index");
		const appSvc = new AppService();
		const clusterSvc = new ClusterService();
		const regSvc = new ContainerRegistryService();

		// get app data:
		const app = await appSvc.findOne({ slug: appSlug }, { populate: ["project"] });
		if (!app)
			if (ownership?.owner) throw new Error(`Unauthorized.`);
			else throw new Error(`App not found.`);

		if (!app.project) throw new Error(`This app is orphan, apps should belong to a project.`);
		if (!deployEnvironmentData.imageURL) throw new Error(`Build image URL is required.`);
		if (!deployEnvironmentData.buildTag) throw new Error(`Build number (image's tag) is required.`);

		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		const { buildTag } = deployEnvironmentData;

		const project = app.project as IProject;
		const { slug: projectSlug } = project;

		// Assign default values to optional params:

		if (!deployEnvironmentData.size) deployEnvironmentData.size = "1x";
		if (!deployEnvironmentData.shouldInherit) deployEnvironmentData.shouldInherit = true;
		if (!deployEnvironmentData.replicas) deployEnvironmentData.replicas = 1;
		if (!deployEnvironmentData.redirect) deployEnvironmentData.redirect = true;

		// Check DX quota
		const quotaRes = await checkQuota(ownership?.workspace, { resourceSize: deployEnvironmentData.size });
		if (!quotaRes.status) throw new Error(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed)
			throw new Error(`You've exceeded the limit amount of container size (${quotaRes.data.type} / Max size: ${quotaRes.data.limits.size}x).`);

		// Validate deploy environment data:

		// cluster
		if (!deployEnvironmentData.cluster) throw new Error(`Param "cluster" (Cluster's short name) is required.`);
		const cluster = await clusterSvc.findOne({ slug: deployEnvironmentData.cluster });
		if (!cluster) throw new Error(`Cluster "${deployEnvironmentData.cluster}" is not valid`);

		// namespace
		if (!deployEnvironmentData.namespace) deployEnvironmentData.namespace = `${projectSlug}-${env}`;

		// container registry
		if (!deployEnvironmentData.registry) throw new Error(`Param "registry" (Container Registry's slug) is required.`);
		const registry = await regSvc.findOne({ slug: deployEnvironmentData.registry });
		if (!registry) throw new Error(`Container Registry "${deployEnvironmentData.registry}" is not existed.`);

		// Domains & SSL certificate...
		if (!deployEnvironmentData.domains) deployEnvironmentData.domains = [];
		if (deployEnvironmentData.useGeneratedDomain) {
			const subdomain = `${projectSlug}-${appSlug}.${env}`;
			const {
				status,
				messages,
				data: { domain },
			} = await dxCreateDomain({ name: subdomain, data: cluster.primaryIP }, ownership.workspace.dx_key);
			if (!status) logWarn(`[APP_CONTROLLER] ${messages.join(". ")}`);
			deployEnvironmentData.domains = status ? [domain, ...deployEnvironmentData.domains] : deployEnvironmentData.domains;
		}

		if (!deployEnvironmentData.ssl) {
			deployEnvironmentData.ssl = deployEnvironmentData.domains.length > 0 ? "letsencrypt" : "none";
		}
		if (!sslIssuerList.includes(deployEnvironmentData.ssl))
			throw new Error(`Param "ssl" issuer is invalid, should be one of: "letsencrypt", "custom" or "none".`);

		if (deployEnvironmentData.ssl === "letsencrypt") {
			deployEnvironmentData.tlsSecret = makeSlug(deployEnvironmentData.domains[0]);
		} else if (deployEnvironmentData.ssl === "custom") {
			if (!deployEnvironmentData.tlsSecret) {
				deployEnvironmentData.tlsSecret = makeSlug(deployEnvironmentData.domains[0]);
			}
		} else {
			deployEnvironmentData.tlsSecret = "";
		}

		// Exposing ports, enable/disable CDN, and select Ingress type
		if (isUndefined(deployEnvironmentData.port)) throw new Error(`Param "port" is required.`);
		if (isUndefined(deployEnvironmentData.cdn) || !isBoolean(deployEnvironmentData.cdn)) deployEnvironmentData.cdn = false;
		// deployEnvironmentData.ingress = "nginx";

		// create deploy environment in the app:
		let updatedApp = await appSvc.updateOne(
			{ slug: appSlug },
			{
				[`deployEnvironment.${env}`]: deployEnvironmentData,
			}
		);
		// console.log("updatedApp :>> ", updatedApp);
		if (!updatedApp) throw new Error(`Failed to create "${env}" deploy environment.`);

		const appConfig = await getAppConfigFromApp(updatedApp);
		console.log("buildTag :>> ", buildTag);

		let deployment: GenerateDeploymentResult = await generateDeployment({
			appSlug: app.slug,
			env,
			username: ownership.owner.slug,
			workspace: ownership.workspace,
			buildTag: buildTag,
		});

		const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = deployment;

		// update data to deploy environment:
		let serverDeployEnvironment = await getDeployEvironmentByApp(updatedApp, env);
		serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
		serverDeployEnvironment.deploymentYaml = deploymentContent;
		serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
		serverDeployEnvironment.updatedAt = new Date();
		serverDeployEnvironment.lastUpdatedBy = ownership.owner.username;

		// Update {user}, {project}, {environment} to database before rolling out
		const updatedAppData = { deployEnvironment: updatedApp.deployEnvironment || {} } as QuerySelector<IApp> & IApp;
		updatedAppData.lastUpdatedBy = ownership.owner.username;
		updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

		updatedApp = await appSvc.updateOne({ slug: app.slug }, updatedAppData);
		if (!updatedApp) throw new Error("Unable to apply new domain configuration for " + env + " environment of " + app.slug + "app.");

		// ----- SHOULD ROLL OUT NEW RELEASE OR NOT ----

		let workloads = await ClusterManager.getDeploysByFilter(serverDeployEnvironment.namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${mainAppName}`,
		});
		// Fallback support for deprecated mainAppName
		if (!workloads || workloads.length === 0) {
			workloads = await ClusterManager.getDeploysByFilter(serverDeployEnvironment.namespace, {
				context: cluster.contextName,
				filterLabel: `main-app=${deprecatedMainAppName}`,
			});
		}

		if (workloads && workloads.length > 0) {
			// create new release and roll out
			const release = await createReleaseFromApp(updatedApp, env, buildTag, {
				author: ownership.owner,
				cliVersion: currentVersion(),
				workspace: ownership.workspace,
			});

			const result = await ClusterManager.rollout(release._id.toString());
			if (result.error) throw new Error(`Failed to roll out the release :>> ${result.error}.`);
		}

		return updatedApp;
	}

	async viewDeployEnvironmentLogs(app: IApp, env: string) {
		const deployEnvironment = app.deployEnvironment[env];

		const { ClusterService } = await import("./index");
		const clusterSvc = new ClusterService();

		const clusterSlug = deployEnvironment.cluster;
		const cluster = await clusterSvc.findOne({ slug: clusterSlug, workspace: app.workspace });
		if (!cluster) return;

		const { contextName: context } = cluster;
		const mainAppName = await getDeploymentName(app);
		const pods = await ClusterManager.getPodsByFilter(deployEnvironment.namespace, {
			context,
			filterLabel: `main-app=${mainAppName}`,
			metrics: false,
		});

		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();
		const deprecatedApps = await ClusterManager.getPodsByFilter(deployEnvironment.namespace, {
			context,
			filterLabel: `main-app=${deprecatedMainAppName}`,
			metrics: false,
		});
		pods.push(...deprecatedApps);

		// console.log("pods :>> ", pods);
		if (isEmpty(pods)) return;

		const logs: { [pod: string]: string } = {};

		await Promise.all(
			pods.map(async (pod) => {
				// console.log("pod.metadata :>> ", pod.metadata);
				const podLogs = await ClusterManager.logPod(pod.metadata.name, deployEnvironment.namespace, { context });
				logs[pod.metadata.name] = podLogs;
				return podLogs;
			})
		);
		// console.log("logs :>> ", logs);
		return logs;
	}

	/**
	 * Make deploy environment sleep by scale the replicas to ZERO, so you can wake it up later without re-deploy.
	 */
	async sleepDeployEnvironment(app: IApp, env: string) {
		if (!env) throw new Error(`Params "env" (deploy environment) is required.`);

		const deployEnvironment = app.deployEnvironment[env];
		if (!deployEnvironment) throw new Error(`Deploy environment "${env}" not found.`);

		const clusterSlug = deployEnvironment.cluster;
		if (!clusterSlug) throw new Error(`This app's deploy environment (${env}) hasn't been deployed in any clusters.`);

		const { AppService, ClusterService, ContainerRegistryService } = await import("./index");
		const appSvc = new AppService();
		const clusterSvc = new ClusterService();
		const cluster = await clusterSvc.findOne({ slug: clusterSlug });
		if (!cluster) throw new Error(`Cluster "${clusterSlug}" not found.`);

		if (!deployEnvironment.namespace) throw new Error(`Namespace not found.`);

		const { contextName: context } = cluster;
		const { namespace } = deployEnvironment;

		// get deployment's labels
		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		// switch to the cluster of this environment
		await ClusterManager.authCluster(cluster);

		let success = false;
		let message = "";
		try {
			/**
			 * FALLBACK SUPPORT for deprecated mainAppName
			 */
			await ClusterManager.scaleDeployByFilter(0, namespace, { context, filterLabel: `main-app=${deprecatedMainAppName}` });
			success = true;
		} catch (e) {
			// skip...
		}

		try {
			await ClusterManager.scaleDeployByFilter(0, namespace, { context, filterLabel: `main-app=${mainAppName}` });
			success = true;
		} catch (e) {
			message = `Unable to sleep a deploy environment "${env}" on cluster: ${clusterSlug} (Namespace: ${namespace}): ${e}`;
		}

		// update database
		appSvc.updateOne(
			{ _id: app._id },
			{
				[`deployEnvironment.${env}.replicas`]: 0,
				[`deployEnvironment.${env}.sleepAt`]: new Date(),
			}
		);

		return { success, message };
	}

	/**
	 * Wake a sleeping deploy environment up by scale it to 1 (Will FAIL if this environment hasn't been deployed).
	 */
	async wakeUpDeployEnvironment(app: IApp, env: string) {
		if (!env) throw new Error(`Params "env" (deploy environment) is required.`);

		const deployEnvironment = app.deployEnvironment[env];
		if (!deployEnvironment) throw new Error(`Deploy environment "${env}" not found.`);

		const clusterSlug = deployEnvironment.cluster;
		if (!clusterSlug) throw new Error(`This app's deploy environment (${env}) hasn't been deployed in any clusters.`);

		const { AppService, ClusterService, ContainerRegistryService } = await import("./index");
		const appSvc = new AppService();
		const clusterSvc = new ClusterService();
		const cluster = await clusterSvc.findOne({ slug: clusterSlug });
		if (!cluster) throw new Error(`Cluster "${clusterSlug}" not found.`);

		if (!deployEnvironment.namespace) throw new Error(`Namespace not found.`);

		const { contextName: context } = cluster;
		const { namespace } = deployEnvironment;

		// get deployment's labels
		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		// switch to the cluster of this environment
		await ClusterManager.authCluster(cluster);

		let success = false;
		let message = "";
		try {
			/**
			 * FALLBACK SUPPORT for deprecated mainAppName
			 */
			await ClusterManager.scaleDeployByFilter(1, namespace, { context, filterLabel: `main-app=${deprecatedMainAppName}` });
			success = true;
		} catch (e) {
			// skip...
		}

		try {
			await ClusterManager.scaleDeployByFilter(1, namespace, { context, filterLabel: `main-app=${mainAppName}` });
			success = true;
		} catch (e) {
			message = `Unable to wake up a deploy environment "${env}" on cluster: ${clusterSlug} (Namespace: ${namespace}): ${e}`;
		}

		// update database
		appSvc.updateOne(
			{ _id: app._id },
			{
				[`deployEnvironment.${env}.replicas`]: 1,
				[`deployEnvironment.${env}.awakeAt`]: new Date(),
			}
		);

		return { success, message };
	}

	/**
	 * Take down a deploy environment but still keep the deploy environment information (cluster, registry, namespace,...)
	 */
	async takeDownDeployEnvironment(app: IApp, env: string, options?: IQueryOptions) {
		if (!env) throw new Error(`Params "env" (deploy environment) is required.`);

		const deployEnvironment = app.deployEnvironment[env];
		if (!deployEnvironment) throw new Error(`Deploy environment "${env}" not found.`);

		const clusterSlug = deployEnvironment.cluster;
		if (!clusterSlug) throw new Error(`This app's deploy environment (${env}) hasn't been deployed in any clusters.`);

		const { AppService, ClusterService } = await import("./index");
		const appSvc = new AppService();
		const clusterSvc = new ClusterService();
		const cluster = await clusterSvc.findOne({ slug: clusterSlug });
		if (!cluster) throw new Error(`Cluster "${clusterSlug}" not found.`);

		if (!deployEnvironment.namespace) throw new Error(`Namespace not found.`);

		const { contextName: context } = cluster;
		const { namespace } = deployEnvironment;

		// TODO: get "main-app" label in the "release" of this app
		// get deployment's labels
		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		// double check cluster's accessibility
		await ClusterManager.authCluster(cluster);

		/**
		 * IMPORTANT
		 * ---
		 * Should NOT delete namespace because it will affect other apps in a project!
		 */
		let errorMsg;

		try {
			// Delete INGRESS
			await ClusterManager.deleteIngressByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });
			// Delete SERVICE
			await ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });
			// Delete DEPLOYMENT
			await ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });

			console.log(`✅ Deleted "${mainAppName}" deployment.`);
		} catch (e) {
			errorMsg = `Unable to delete deploy environment "${env}" on cluster: ${clusterSlug} (Namespace: ${namespace}): ${e}`;
		}

		try {
			/**
			 * FALLBACK SUPPORT for deprecated mainAppName
			 */
			// Delete INGRESS
			await ClusterManager.deleteIngressByFilter(namespace, { context, filterLabel: `main-app=${deprecatedMainAppName}` });
			// Delete SERVICE
			await ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `main-app=${deprecatedMainAppName}` });
			// Delete DEPLOYMENT
			await ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `main-app=${deprecatedMainAppName}` });

			console.log(`✅ Deleted "${deprecatedMainAppName}" deployment.`);
		} catch (e) {
			errorMsg += `, ${e}.`;
		}

		if (options?.isDebugging) console.error(`[DEPLOY_ENV_SERVICE]`, errorMsg);

		// update database
		const tookDownAt = new Date();
		app = await appSvc.updateOne({ _id: app._id }, { [`deployEnvironment.${env}.tookDownAt`]: tookDownAt });

		// response data
		return {
			app: {
				slug: app.slug,
				id: app._id,
				owner: app.owner,
				workspace: app.workspace,
				tookDownAt,
				cluster: cluster.slug,
			},
			success: true,
			message: errorMsg,
		};
	}

	async deleteDeployEnvironment(app: IApp, env: string) {
		const { AppService } = await import("./index");
		const appSvc = new AppService();

		// take down deploy environment on clusters
		await this.takeDownDeployEnvironment(app, env);

		// delete deploy environment in database
		const updatedApp = await appSvc.updateOne(
			{
				_id: app._id,
			},
			{
				$unset: { [`deployEnvironment.${env}`]: true },
			},
			{ raw: true }
		);

		return updatedApp;
	}

	/**
	 * Change cluster of a deploy environment
	 * @param app
	 * @param env
	 * @param cluster
	 * @param options
	 * @returns
	 */
	async changeCluster(
		app: IApp,
		env: string,
		cluster: ICluster,
		options: { user: IUser; workspace: IWorkspace; deleteAppOnPreviousCluster?: boolean; isDebugging?: boolean }
	) {
		// validate
		const deployEnvironment = app.deployEnvironment[env];
		if (!deployEnvironment) throw new Error(`Deploy environment "${env}" not found.`);

		// delete app on previous cluster (if needed)
		if (options.deleteAppOnPreviousCluster) {
			app = await this.deleteDeployEnvironment(app, env);
		}

		const { AppService } = await import("./index");
		const appSvc = new AppService(this.ownership);

		// update new cluster slug:
		app = await appSvc.updateOne({ _id: app._id }, { [`deployEnvironment.${env}.cluster`]: cluster.slug });

		const { BuildService } = await import("./index");
		const { default: DeployService } = await import("./DeployService");
		const buildSvc = new BuildService(this.ownership);
		const deploySvc = new DeployService(this.ownership);
		// deploy to new cluster
		const latestBuild = await buildSvc.findOne({ slug: app.latestBuild });
		const { build, release, error } = await deploySvc.deployBuild(latestBuild, {
			env,
			owner: options.user,
			workspace: options.workspace,
			forceRollOut: true,
		});
		if (error) throw new Error(`Unable to deploy new cluster: ${error}`);

		// return
		return { build, release, app };
	}

	/**
	 * Update environment variables of a deploy environment
	 * @param app - IApp
	 * @param env - Deploy environment (dev, prod,...)
	 * @param variables - Array of environment variables: `[{name,value}]`
	 * @returns
	 */
	async updateEnvVars(app: IApp, env: string, variables: KubeEnvironmentVariable[]) {
		// validate
		if (!env) throw new Error(`Params "env" (deploy environment) is required.`);
		if (!variables) throw new Error(`Params "variables" (array of environment variables) is required.`);
		if (!isArray(variables)) throw new Error(`Params "variables" should be an array.`);

		// just to make sure "value" is always "string"
		variables = variables.map(({ name, value }) => ({ name, value: isObject(value) ? JSON.stringify(value) : toString(value) }));

		const deployEnvironment = app.deployEnvironment[env];
		if (!deployEnvironment) throw new Error(`Deploy environment "${env}" not found.`);

		const { AppService, ClusterService } = await import("./index");

		const appSvc = new AppService(this.ownership);
		const appSlug = app.slug;

		// process
		let updatedApp = await appSvc.updateOne(
			{ _id: app._id },
			{
				[`deployEnvironment.${env}.envVars`]: variables,
				[`deployEnvironment.${env}.lastUpdatedBy`]: this.user.slug,
				[`deployEnvironment.${env}.updatedAt`]: new Date(),
			}
		);
		if (!updatedApp) throw new Error(`Unable to update variables of "${env}" deploy environment (App: "${appSlug}").`);

		// TO BE REMOVED SOON: Fallback support "buildNumber"
		if (!deployEnvironment.buildTag && deployEnvironment.buildNumber) deployEnvironment.buildTag = deployEnvironment.buildNumber;

		console.log("deployEnvironment.buildTag :>> ", deployEnvironment.buildTag);

		let message = "";
		// update on cluster -> if it's failed, just ignore and return warning message!
		if (deployEnvironment.cluster && deployEnvironment.buildTag) {
			console.log("Applying new env vars..");
			try {
				const clusterSlug = deployEnvironment.cluster;
				const clusterSvc = new ClusterService(this.ownership);
				const cluster = await clusterSvc.findOne({ slug: clusterSlug });
				if (!cluster) throw new Error(`Cluster "${clusterSlug}" not found.`);

				const { contextName: context } = cluster;
				const { buildTag } = deployEnvironment;

				// generate new deployment YAML
				let deployment: GenerateDeploymentResult = await generateDeployment({
					env,
					appSlug,
					buildTag,
					username: this.user.slug,
					workspace: this.workspace,
				});

				// apply deployment YAML
				await ClusterManager.kubectlApplyContent(deployment.deploymentContent, { context });

				// update to database
				updatedApp = await appSvc.updateOne(
					{ _id: app._id },
					{
						[`deployEnvironment.${env}.deploymentYaml`]: deployment.deploymentContent,
						[`deployEnvironment.${env}.prereleaseDeploymentYaml`]: deployment.prereleaseDeploymentContent,
					}
				);
			} catch (e) {
				message = e.toString();
			}
		}

		return { app: updatedApp, message };
	}
}
