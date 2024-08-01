import { isJSON } from "class-validator";
import { makeSlug } from "diginext-utils/dist/Slug";
import { logWarn } from "diginext-utils/dist/xconsole/log";
import { isArray, isBoolean, isEmpty, isUndefined } from "lodash";
import type { QuerySelector } from "mongoose";

import type { IBuild, ICluster, IProject, IUser, IWorkspace } from "@/entities";
import type { IApp } from "@/entities/App";
import type { DeployEnvironment, IQueryOptions, KubeDeployment } from "@/interfaces";
import type { DeployEnvironmentData } from "@/interfaces/AppInterfaces";
import type { DeployEnvironmentVolume } from "@/interfaces/DeployEnvironmentVolume";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { Ownership } from "@/interfaces/SystemTypes";
import { sslIssuerList } from "@/interfaces/SystemTypes";
import { getDeployEvironmentByApp } from "@/modules/apps/get-app-environment";
import { createReleaseFromApp } from "@/modules/build/create-release-from-app";
import type { GenerateDeploymentResult } from "@/modules/deploy";
import getDeploymentName from "@/modules/deploy/generate-deployment-name";
import { generateDeploymentV2 } from "@/modules/deploy/generate-deployment-v2";
import { dxCreateDomain, dxUpdateDomain } from "@/modules/diginext/dx-domain";
import ClusterManager from "@/modules/k8s";
import { checkQuota } from "@/modules/workspace/check-quota";
import { currentVersion } from "@/plugins";
import { allElementsAreEqual } from "@/plugins/array";
import { formatEnvVars } from "@/plugins/env-var";
import { isValidKubernetesMemoryFormat } from "@/plugins/k8s-helper";
import { MongoDB } from "@/plugins/mongodb";
import { containsSpecialCharacters } from "@/plugins/string";

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
			} = await dxCreateDomain({ name: subdomain, data: cluster.primaryIP, userId: this.user.dxUserId }, ownership.workspace.dx_key);
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

		// const appConfig = await getAppConfigFromApp(updatedApp);
		// console.log("buildTag :>> ", buildTag);

		let deployment = await generateDeploymentV2({
			env,
			skipPrerelease: true, // skip overwrite "prerelease" domain origin
			appSlug: app.slug,
			username: ownership.owner.slug,
			workspace: ownership.workspace,
			buildTag: buildTag,
		});

		const { endpoint, deploymentContent } = deployment;

		// update data to deploy environment:
		let serverDeployEnvironment = await getDeployEvironmentByApp(updatedApp, env);
		// serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
		serverDeployEnvironment.deploymentYaml = deploymentContent;
		// serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
		serverDeployEnvironment.updatedAt = new Date();
		serverDeployEnvironment.lastUpdatedBy = ownership.owner.username;
		serverDeployEnvironment.owner = MongoDB.toString(this.user._id);
		serverDeployEnvironment.ownerSlug = this.user.slug;

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
		await ClusterManager.authCluster(cluster, { ownership: this.ownership });

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
		await ClusterManager.authCluster(cluster, { ownership: this.ownership });

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
		if (!app.deployEnvironment) throw new Error(`Unable to take down, this app doesn't have any deploy environments.`);
		if (!env) throw new Error(`Unable to take down, param "env" (deploy environment) is required.`);
		let errorMsg;

		const deployEnvironment = app.deployEnvironment[env];
		if (!deployEnvironment) throw new Error(`Deploy environment "${env}" not found.`);

		const clusterSlug = deployEnvironment.cluster;
		if (!clusterSlug) throw new Error(`This app's deploy environment (${env}) hasn't been deployed in any clusters.`);

		const { AppService, ClusterService } = await import("./index");
		const appSvc = new AppService();
		const clusterSvc = new ClusterService();
		const cluster = await clusterSvc.findOne({ slug: clusterSlug });
		if (!cluster) {
			console.log(`[DEPLOY_ENVIRONMENT] takeDownDeployEnvironment() > Cluster "${clusterSlug}" not found.`);
			// response data
			errorMsg = `Cluster "${clusterSlug}" not found.`;
			return {
				app: {
					slug: app.slug,
					id: app._id,
					owner: app.owner,
					workspace: app.workspace,
				},
				success: true,
				message: errorMsg,
			};
		}

		if (!deployEnvironment.namespace) {
			console.log(`[DEPLOY_ENVIRONMENT] takeDownDeployEnvironment() > Namespace not found.`);
			errorMsg = `Namespace not found.`;
			return {
				app: {
					slug: app.slug,
					id: app._id,
					owner: app.owner,
					workspace: app.workspace,
				},
				success: true,
				message: errorMsg,
			};
		}

		const { contextName: context } = cluster;
		const { namespace } = deployEnvironment;

		// TODO: get "main-app" label in the "release" of this app
		// get deployment's labels
		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		// double check cluster's accessibility
		await ClusterManager.authCluster(cluster, { ownership: this.ownership });

		/**
		 * IMPORTANT
		 * ---
		 * Should NOT delete namespace because it will affect other apps in a project!
		 */

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
		if (!deployEnvironment.buildId) throw new Error(`This deploy environment (${env}) hasn't been built before.`);
		if (!deployEnvironment.cluster || !deployEnvironment.latestRelease)
			throw new Error(`This deploy environment (${env}) hasn't been deployed to any clusters.`);

		// verify target cluster
		if (!cluster.isVerified || !cluster.contextName) throw new Error(`Cluster "${cluster.slug}" hasn't been verified.`);

		// delete app on previous cluster (if needed)
		if (options.deleteAppOnPreviousCluster) {
			app = await this.deleteDeployEnvironment(app, env);
		}

		const { AppService } = await import("./index");
		const appSvc = new AppService(this.ownership);

		// update new cluster slug:
		app = await appSvc.updateOne({ _id: app._id }, { [`deployEnvironment.${env}.cluster`]: cluster.slug });

		// get latest release
		const { ReleaseService } = await import("./index");
		const releaseSvc = new ReleaseService(this.ownership);
		const release = await releaseSvc.findOne({ _id: deployEnvironment.latestRelease }, { populate: ["build"] });

		if (!release.build) throw new Error(`Build not found in this release.`);
		const build = release.build as IBuild;

		// clone to new release with new cluster slug:
		const newReleaseData = { ...release, cluster: cluster.slug };
		delete newReleaseData._id;
		delete (newReleaseData as any).id;
		delete newReleaseData.slug;
		delete newReleaseData.createdAt;
		delete newReleaseData.updatedAt;
		delete newReleaseData.owner;
		delete newReleaseData.ownerSlug;

		const newRelease = await releaseSvc.create(newReleaseData);
		if (!newRelease) throw new Error(`Unable to create new release.`);

		// roll out new release:
		const rolloutResult = await ClusterManager.rolloutV2(MongoDB.toString(newRelease._id));
		if (rolloutResult.error) throw new Error(rolloutResult.error);

		// change DXUP domain record (if any)
		if (deployEnvironment.domains && deployEnvironment.domains.filter((domain) => domain.indexOf(".diginext.site") > -1).length > 0) {
			if (this.workspace && this.workspace.dx_key) {
				for (const domain of deployEnvironment.domains.filter((_domain) => _domain.indexOf(".diginext.site") > -1)) {
					const subdomain = domain.replace(".diginext.site", "");
					dxUpdateDomain({ subdomain, data: cluster.primaryIP, userId: this.user.dxUserId }, this.workspace.dx_key).catch(console.error);
				}
			} else {
				console.error("DeployEnvironmentService > changeCluster() > Update domain A record data > No WORKSPACE or DX_KEY found.");
			}
		}

		// return
		return { build, release: newRelease, app };
	}

	/**
	 * Get environment variables of a deploy environment
	 * @param app - IApp
	 * @param env - Deploy environment (dev, prod,...)
	 * @returns
	 */
	async getEnvVars(app: IApp, env: string) {
		// validate
		if (!env) throw new Error(`Params "env" (deploy environment) is required.`);
		return formatEnvVars(app.deployEnvironment[env].envVars);
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
		variables = formatEnvVars(variables);

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
				let deployment: GenerateDeploymentResult = await generateDeploymentV2({
					env,
					skipPrerelease: true, // skip overwrite "prerelease" domain origin
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
						// [`deployEnvironment.${env}.prereleaseDeploymentYaml`]: deployment.prereleaseDeploymentContent,
					}
				);
			} catch (e) {
				message = e.toString();
			}
		}

		return { app: updatedApp, message };
	}

	/**
	 * Add persistent volume to deploy environment
	 * @param app - IApp
	 * @param env - Deploy environment (dev, prod,...)
	 * @param data - Persistent volume configuration
	 */
	async addPersistentVolume(app: IApp, env: string, data: DeployEnvironmentVolume) {
		// validate
		if (!app) throw new Error(`App's data is required`);
		if (!data) throw new Error(`Volume configuration data is required`);
		if (containsSpecialCharacters(data.name)) throw new Error(`Volume name cannot contain any special characters.`);
		if (!app.deployEnvironment) throw new Error(`This app doesn't have any deploy environments.`);
		if (!app.deployEnvironment[env]) throw new Error(`This app doesn't have "${env}" deploy environment.`);
		if (app.deployEnvironment[env].volumes?.find((vol) => vol.name === data.name)) throw new Error(`Volume name is existed, choose another one.`);

		const { buildTag, cluster: clusterSlug } = app.deployEnvironment[env];

		// get cluster
		const { ClusterService } = await import("@/services");
		const clusterSvc = new ClusterService(this.ownership);
		const cluster = await clusterSvc.findOne({ slug: clusterSlug });
		if (!cluster || !cluster.contextName) throw new Error(`Cluster "${clusterSlug}" not found or not verified.`);
		const { contextName: context } = cluster;

		// update db: NEW VOLUME
		const { AppService } = await import("./index");
		const appSvc = new AppService(this.ownership);
		app = await appSvc.updateOne(
			{ _id: app._id },
			{
				$push: {
					[`deployEnvironment.${env}.volumes`]: data,
				},
			},
			{ raw: true }
		);

		// add {PersistentVolumeClaim} to Kubernetes deployment
		const deployment = await await generateDeploymentV2({
			env,
			skipPrerelease: true, // skip overwrite "prerelease" domain origin
			appSlug: app.slug,
			username: this.ownership.owner.slug,
			workspace: this.ownership.workspace,
			buildTag,
		});

		// Apply deployment YAML
		await ClusterManager.kubectlApplyContent(deployment.deploymentContent, { context });

		// update db: DEPLOYMENT YAML
		app = await appSvc.updateOne(
			{ _id: app._id },
			{
				$set: {
					[`deployEnvironment.${env}.deploymentYaml`]: deployment.deploymentContent,
					// [`deployEnvironment.${env}.prereleaseDeploymentYaml`]: deployment.prereleaseDeploymentContent,
				},
			},
			{ raw: true }
		);

		// result
		return app.deployEnvironment[env].volumes.find((vol) => vol.name === data.name);
	}

	/**
	 * Add persistent volume to deploy environment
	 * @param app - IApp
	 * @param env - Deploy environment (dev, prod,...)
	 * @param data - Persistent volume configuration
	 */
	async addPersistentVolumeBySize(app: IApp, env: string, data: Pick<DeployEnvironmentVolume, "name" | "size" | "mountPath">) {
		// validate
		if (containsSpecialCharacters(data.name)) throw new Error(`Volume name cannot contain any special characters.`);
		if (!app.deployEnvironment) throw new Error(`This app doesn't have any deploy environments.`);
		if (!app.deployEnvironment[env]) throw new Error(`This app doesn't have "${env}" deploy environment.`);
		if (app.deployEnvironment[env].volumes?.find((vol) => vol.name === data.name)) throw new Error(`Volume name is existed, choose another one.`);
		if (!isValidKubernetesMemoryFormat(data.size)) throw new Error(`Volume size is not valid`);

		// deploy environment
		const deployEnvironment = app.deployEnvironment[env];
		const { cluster: clusterSlug, namespace } = deployEnvironment;

		// get cluster
		const { ClusterService } = await import("@/services");
		const clusterSvc = new ClusterService(this.ownership);
		const cluster = await clusterSvc.findOne({ slug: clusterSlug });
		if (!cluster || !cluster.contextName) throw new Error(`Cluster "${clusterSlug}" not found or not verified.`);
		const { contextName: context } = cluster;

		// get storage class name
		const allStorageClasses = await ClusterManager.getAllStorageClasses({ context });
		if (!allStorageClasses || allStorageClasses.length === 0)
			throw new Error(`Unable to create volume, this cluster doesn't have any storage class.`);
		const storageClass = allStorageClasses[0].metadata.name;

		// get node of deploy environment
		const pods = await ClusterManager.getPods(namespace, { context });
		if (!pods || pods.length === 0)
			throw new Error(`No running deploy environments, you can only add volumes to running app's deploy environment.`);
		const podNodes = pods.map((pod) => pod.spec.nodeName);
		if (!allElementsAreEqual(podNodes)) {
			logWarn(`Pods were scheduled to different nodes, they will be rescheduled in the same node to share the persistent volume.`);
		}
		const node = podNodes[0]; // <- select the first node found as volume's node

		// process
		const volumeData: DeployEnvironmentVolume = {
			...data,
			node,
			storageClass,
		};

		// result
		return this.addPersistentVolume(app, env, volumeData);
	}

	/**
	 * Delete persistent volume to deploy environment
	 * @param app - IApp
	 * @param env - Deploy environment name (dev, prod,...)
	 * @param name - Persistent volume name
	 */
	async removePersistentVolume(app: IApp, env: string, name: string) {
		// validate
		if (!app) throw new Error(`App's data is required`);
		if (!app.deployEnvironment) throw new Error(`This app doesn't have any deploy environments.`);
		if (!app.deployEnvironment[env]) throw new Error(`This app doesn't have "${env}" deploy environment.`);
		if (!name) throw new Error(`Volume name is required.`);
		if (!app.deployEnvironment[env].volumes || !app.deployEnvironment[env].volumes.find((vol) => vol.name === name))
			throw new Error(`Volume not found.`);

		// deploy environment
		const deployEnvironment = app.deployEnvironment[env];
		const { cluster: clusterSlug, namespace, buildTag } = deployEnvironment;

		// get cluster
		const { ClusterService } = await import("@/services");
		const clusterSvc = new ClusterService(this.ownership);
		const cluster = await clusterSvc.findOne({ slug: clusterSlug });
		if (!cluster || !cluster.contextName) throw new Error(`Cluster "${clusterSlug}" not found or not verified.`);
		const { contextName: context } = cluster;

		// update db
		const { AppService } = await import("./index");
		const appSvc = new AppService(this.ownership);

		// update db: Remove "volume" in "deployEnvironment"
		const { volumes } = app.deployEnvironment[env];
		const updatedVolumes = volumes.filter((volume) => volume.name !== name);
		app = await appSvc.updateOne({ _id: app._id }, { [`deployEnvironment.${env}.volumes`]: updatedVolumes });

		// unattach volume from the K8S deployment
		const deployment = await await generateDeploymentV2({
			env,
			skipPrerelease: true, // skip overwrite "prerelease" domain origin
			appSlug: app.slug,
			username: this.ownership.owner.slug,
			workspace: this.ownership.workspace,
			buildTag,
		});

		// Apply deployment YAML
		await ClusterManager.kubectlApplyContent(deployment.deploymentContent, { context });

		// update db: DEPLOYMENT YAML
		app = await appSvc.updateOne(
			{ _id: app._id },
			{
				$set: {
					[`deployEnvironment.${env}.deploymentYaml`]: deployment.deploymentContent,
					// [`deployEnvironment.${env}.prereleaseDeploymentYaml`]: "deployment.prereleaseDeploymentContent",
				},
			},
			{ raw: true }
		);

		// remove {PersistentVolumeClaim} of Kubernetes deployment
		const result = await ClusterManager.deletePersistentVolumeClaim(name, namespace, { context });
		const message = result ? `Unable to delete persistent volume (${name}) of Kubernetes deployment (${app.projectSlug}-${app.slug}).` : "";

		// FIXME: wait for {PersistentVolume} to be deleted

		// result
		return { success: true, message };
	}
}
