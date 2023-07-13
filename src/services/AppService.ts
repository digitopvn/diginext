import { isJSON } from "class-validator";
import { logWarn } from "diginext-utils/dist/xconsole/log";
import { isBoolean, isEmpty, isString, isUndefined } from "lodash";
import type { QuerySelector } from "mongoose";
import path from "path";

import { CLI_CONFIG_DIR } from "@/config/const";
import type { DeployEnvironmentData } from "@/controllers/AppController";
import type { ICluster, IFramework, IProject } from "@/entities";
import type { IApp } from "@/entities/App";
import { appSchema } from "@/entities/App";
import type { DeployEnvironment, IQueryFilter, IQueryOptions, IQueryPagination, KubeDeployment } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import { sslIssuerList } from "@/interfaces/SystemTypes";
import { migrateAppEnvironmentVariables } from "@/migration/migrate-app-environment";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import { getDeployEvironmentByApp } from "@/modules/apps/get-app-environment";
import { createReleaseFromApp } from "@/modules/build/create-release-from-app";
import type { GenerateDeploymentResult } from "@/modules/deploy";
import { generateDeployment } from "@/modules/deploy";
import getDeploymentName from "@/modules/deploy/generate-deployment-name";
import { dxCreateDomain } from "@/modules/diginext/dx-domain";
import { getRepoURLFromRepoSSH } from "@/modules/git";
import GitProviderAPI from "@/modules/git/git-provider-api";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import ClusterManager from "@/modules/k8s";
import { checkQuota } from "@/modules/workspace/check-quota";
import { currentVersion, parseGitRepoDataFromRepoSSH, pullOrCloneGitRepo } from "@/plugins";
import { MongoDB } from "@/plugins/mongodb";
import { makeSlug } from "@/plugins/slug";

import BaseService from "./BaseService";
import { ClusterService, ContainerRegistryService, GitProviderService, ProjectService, WorkspaceService } from "./index";

export type DeployEnvironmentApp = DeployEnvironment & {
	app: IApp;
	appSlug: string;
	cluster: ICluster;
};

export type KubeDeploymentOnCluster = KubeDeployment & {
	cluster: ICluster;
};

export class AppService extends BaseService<IApp> {
	projectSvc = new ProjectService();

	wsSvc = new WorkspaceService();

	clusterSvc = new ClusterService();

	regSvc = new ContainerRegistryService();

	constructor() {
		super(appSchema);
	}

	async create(data: Partial<IApp>, options?: IQueryOptions & IQueryPagination) {
		// validate
		let project: IProject;
		let appDto = { ...data };

		// ownership
		if (!data.owner && !MongoDB.isValidObjectId(data.owner)) throw new Error(`[ObjectID] "owner" is required.`);
		if (!data.workspace && !MongoDB.isValidObjectId(data.workspace)) throw new Error(`[ObjectID] "workspace" is required.`);
		const workspace = await this.wsSvc.findOne({ _id: data.workspace });
		if (!workspace) throw new Error(`Invalid workspace.`);

		// check dx quota
		const quotaRes = await checkQuota(workspace);
		if (!quotaRes.status) throw new Error(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed)
			throw new Error(`You've exceeded the limit amount of apps (${quotaRes.data.type} / Max. ${quotaRes.data.limits.apps} apps).`);

		// validate
		if (!data.project) throw new Error(`Project ID or slug or instance is required.`);
		if (!data.name) throw new Error(`App's name is required.`);
		if (!data.git) throw new Error("App's git info is required.");

		// find parent project of this app
		if (MongoDB.isValidObjectId(data.project)) {
			project = await this.projectSvc.findOne({ _id: data.project });
		} else if (isString(data.project)) {
			project = await this.projectSvc.findOne({ slug: data.project });
		} else {
			throw new Error(`"project" is not a valid ID or slug.`);
		}

		if (!project) throw new Error(`Project "${data.project}" not found.`);
		appDto.projectSlug = project.slug;

		// framework
		if (!data.framework) data.framework = { name: "none", slug: "none", repoURL: "unknown", repoSSH: "unknown" } as IFramework;
		if ((data.framework as string) === "none")
			data.framework = { name: "none", slug: "none", repoURL: "unknown", repoSSH: "unknown" } as IFramework;
		appDto.framework = data.framework as IFramework;

		// git
		if (isString(data.git)) {
			const gitData = parseGitRepoDataFromRepoSSH(data.git);
			if (!gitData) throw new Error(`Git repository information is not valid.`);

			data.git = {
				repoSSH: data.git as string,
				repoURL: getRepoURLFromRepoSSH(gitData.gitProvider, gitData.fullSlug),
				provider: gitData.gitProvider,
			};
		}
		appDto.git = data.git;

		let newApp: IApp;

		try {
			newApp = await super.create(appDto, options);
			if (!newApp) throw new Error(`Unable to create new app: "${appDto.name}".`);
		} catch (e) {
			throw new Error(e.toString());
		}

		const newAppId = newApp._id;

		// migrate app environment variables if needed (convert {Object} to {Array})
		const migratedApp = await migrateAppEnvironmentVariables(newApp);
		if (migratedApp) newApp = migratedApp;

		// add this new app to the project info
		if (project) {
			const projectApps = [...(project.apps || []), newAppId];
			[project] = await this.projectSvc.update({ _id: project._id }, { apps: projectApps });
		}

		return newApp;
	}

	async createWithGitURL(
		repoSSH: string,
		gitProviderID: string,
		ownership: Ownership,
		options?: {
			/**
			 * `DANGER`
			 * ---
			 * Delete app and git repo if they were existed.
			 * @default false
			 */
			force?: boolean;
			/**
			 * If `TRUE`, return the existing app instead of throwing errors.
			 * @default false;
			 */
			returnExisting?: boolean;
			/**
			 * @default main
			 */
			gitBranch?: string;
			/**
			 * If `TRUE`: remove `.github/*` directory after pulling/cloning the repo.
			 */
			removeCI?: boolean;
			isDebugging?: boolean;
		}
	) {
		const appDto: Partial<IApp> = {};
		const workspace = ownership.workspace;
		const owner = ownership.owner;
		if (options?.isDebugging) console.log("createWithGitURL() > ownership :>> ", { workspace, owner });

		// parse git data
		const repoData = parseGitRepoDataFromRepoSSH(repoSSH);
		if (options?.isDebugging) console.log("createWithGitURL() > repoData :>> ", repoData);

		if (!repoData) throw new Error(`Unable to read git repo SSH.`);
		const { repoSlug } = repoData;

		// default project
		const projectSvc = new ProjectService();
		let project = await projectSvc.findOne({ isDefault: true, workspace: workspace._id }, options);
		if (!project) project = await projectSvc.create({ name: "Default", isDefault: true, workspace: workspace._id, owner: owner._id });

		// git provider
		const gitSvc = new GitProviderService();
		const gitProvider = await gitSvc.findOne({ _id: gitProviderID });
		if (options?.isDebugging) console.log("createWithGitURL() > gitProvider :>> ", gitProvider);
		if (!gitProvider) throw new Error(`Git provider not found.`);

		// new repo slug
		const newRepoSlug = `${project.slug}-${makeSlug(repoSlug)}`.toLowerCase();
		const newRepoSSH = `git@${gitProvider.host}:${gitProvider.org}/${newRepoSlug}.git`;

		// check app is existed
		const existingApp = await this.findOne({ "git.repoSSH": newRepoSSH, workspace: workspace._id }, options);
		if (options?.isDebugging) console.log("createWithGitURL() > existingApp :>> ", existingApp);
		if (existingApp) {
			// [DANGEROUS] delete existing app when `--force` is specified:
			if (options?.force) {
				await this.softDelete({ "git.repoSSH": newRepoSSH, workspace: workspace._id });
			} else {
				if (options?.returnExisting) return existingApp;
				throw new Error(`Unable to import: app was existed with name "${existingApp.slug}" (Project: "${project.name}").`);
			}
		}

		// clone/pull that repo url
		const branch = options?.gitBranch || "main";
		const SOURCE_CODE_DIR = `cache/${project.slug}/${newRepoSlug}/${branch}`;
		const APP_DIR = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE_DIR);
		await pullOrCloneGitRepo(repoSSH, APP_DIR, branch, {
			isDebugging: options?.isDebugging,
			useAccessToken: { type: gitProvider.method === "bearer" ? "Bearer" : "Basic", value: gitProvider.access_token },
			removeGitOnFinish: true,
			removeCIOnFinish: options.removeCI,
		});

		// delete current git
		// await deleteFolderRecursive(path.join(APP_DIR, ".git"));

		try {
			await GitProviderAPI.deleteGitRepository(gitProvider, gitProvider.org, newRepoSlug);
		} catch (e) {}

		// create git repo
		const gitRepo = await GitProviderAPI.createGitRepository(
			gitProvider,
			{
				name: newRepoSlug,
				private: true,
				description: `Forked from ${repoSSH}`,
			},
			options
		);

		// setup initial repo: default branches, locked,...
		await initalizeAndCreateDefaultBranches({
			targetDirectory: APP_DIR,
			repoSSH: newRepoSSH,
			git: gitProvider,
			username: owner.slug,
			isDebugging: options?.isDebugging,
		});

		// prepare app data
		appDto.name = repoSlug;
		appDto.owner = owner._id;
		appDto.ownerSlug = owner.slug;
		appDto.workspace = workspace._id;
		appDto.workspaceSlug = workspace.slug;
		appDto.project = project._id;
		appDto.projectSlug = project.slug;
		appDto.gitProvider = gitProvider._id;
		appDto.git = { provider: gitProvider.type, repoSSH: gitRepo.ssh_url, repoURL: gitRepo.repo_url };
		appDto.framework = { name: "none", slug: "none", repoURL: "unknown", repoSSH: "unknown" } as IFramework;
		// ownership
		appDto.workspace = workspace._id;
		appDto.workspaceSlug = workspace.slug;
		appDto.owner = owner._id;
		appDto.ownerSlug = owner.slug;

		// save to database
		const newApp = await this.create(appDto, options);

		// add app & app slug to project
		await projectSvc.updateOne({ _id: project._id }, { $push: { apps: newApp._id, appSlugs: newApp.slug } }, { raw: true });

		return newApp;
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<IApp[]> {
		const { status = false } = options || {};

		// always populate "project" field
		// options.populate =
		// 	!options.populate || options.populate.length === 0
		// 		? (options.populate = ["project"])
		// 		: [...options.populate.filter((field) => field !== "project"), "project"];

		const apps = await super.find(filter, options, pagination);

		if (!status) return apps;

		const clusterFilter: any = {};
		if (filter?.workspace) clusterFilter.workspace = filter.workspace;
		const clusters = await this.clusterSvc.find(clusterFilter);

		// check app deploy environment's status in clusters
		const appsWithStatus = await Promise.all(
			apps
				.map(async (app) => {
					if (app && app.deployEnvironment) {
						for (const env of Object.keys(app.deployEnvironment)) {
							if (!app.deployEnvironment[env]) app.deployEnvironment[env] = { buildNumber: "" };

							// default values
							app.deployEnvironment[env].readyCount = 0;
							app.deployEnvironment[env].status = "undeployed";

							if (!app.deployEnvironment[env].cluster) return app;

							// find cluster & namespace
							const clusterSlug = app.deployEnvironment[env].cluster;
							const cluster = clusters.find((_cluster) => _cluster.slug === clusterSlug);
							if (!cluster) return app;

							const { contextName: context } = cluster;
							if (!context) return app;

							const { namespace } = app.deployEnvironment[env];
							if (!namespace) return app;

							// find workloads base on "main-app" label
							const mainAppName = await getDeploymentName(app);
							const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();
							let [deployOnCluster] = await ClusterManager.getDeploys(namespace, {
								filterLabel: `main-app=${mainAppName}`,
								context,
							});
							if (!deployOnCluster)
								[deployOnCluster] = await ClusterManager.getDeploys(namespace, {
									filterLabel: `main-app=${deprecatedMainAppName}`,
									context,
								});

							// console.log(`----- ${app.name} -----`);
							// console.log("- mainAppName :>> ", mainAppName);
							// console.log("- deployOnCluster.metadata.name :>> ", deployOnCluster?.metadata?.name);
							// console.log("- deployOnCluster.status.replicas :>> ", deployOnCluster?.status?.replicas);
							// console.log("- deployOnCluster.status.readyReplicas :>> ", deployOnCluster?.status?.readyReplicas);
							// console.log("- deployOnCluster.status.availableReplicas :>> ", deployOnCluster?.status?.availableReplicas);
							// console.log("- deployOnCluster.status.unavailableReplicas :>> ", deployOnCluster?.status?.unavailableReplicas);

							if (!deployOnCluster) {
								app.deployEnvironment[env].status = "undeployed";
								return app;
							}

							app.deployEnvironment[env].readyCount =
								deployOnCluster.status.readyReplicas ?? deployOnCluster.status.availableReplicas ?? 0;
							// console.log("- app.deployEnvironment[env].readyCount :>> ", app.deployEnvironment[env].readyCount);

							if (
								deployOnCluster.status.replicas === deployOnCluster.status.availableReplicas ||
								deployOnCluster.status.replicas === deployOnCluster.status.readyReplicas
							) {
								app.deployEnvironment[env].status = "healthy";
								return app;
							}

							if (deployOnCluster.status.unavailableReplicas && deployOnCluster.status.unavailableReplicas > 0) {
								app.deployEnvironment[env].status = "partial_healthy";
								return app;
							}

							if (
								deployOnCluster.status.availableReplicas === 0 ||
								deployOnCluster.status.unavailableReplicas === deployOnCluster.status.replicas ||
								deployOnCluster.status.readyReplicas === 0
							) {
								app.deployEnvironment[env].status = "failed";
								return app;
							}

							app.deployEnvironment[env].status = "unknown";
						}
					}

					return app;
				})
				.filter((app) => typeof app !== "undefined")
		);

		return appsWithStatus;
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
		ownership?: Ownership
	) {
		// conversion if needed...
		if (isJSON(params.deployEnvironmentData))
			params.deployEnvironmentData = JSON.parse(params.deployEnvironmentData as unknown as string) as DeployEnvironmentData;

		//
		const { env, deployEnvironmentData } = params;
		if (!appSlug) throw new Error(`App slug is required.`);
		if (!env) throw new Error(`Deploy environment name is required.`);
		if (!deployEnvironmentData) throw new Error(`Deploy environment configuration is required.`);

		// get app data:
		const app = await this.findOne({ slug: appSlug }, { populate: ["project"] });
		if (!app)
			if (ownership?.owner) throw new Error(`Unauthorized.`);
			else throw new Error(`App not found.`);

		if (!app.project) throw new Error(`This app is orphan, apps should belong to a project.`);
		if (!deployEnvironmentData.imageURL) throw new Error(`Build image URL is required.`);
		if (!deployEnvironmentData.buildNumber) throw new Error(`Build number (image's tag) is required.`);

		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		const { buildNumber } = deployEnvironmentData;

		const project = app.project as IProject;
		const { slug: projectSlug } = project;

		// Assign default values to optional params:

		if (!deployEnvironmentData.size) deployEnvironmentData.size = "1x";
		if (!deployEnvironmentData.shouldInherit) deployEnvironmentData.shouldInherit = true;
		if (!deployEnvironmentData.replicas) deployEnvironmentData.replicas = 1;
		if (!deployEnvironmentData.redirect) deployEnvironmentData.redirect = true;

		// Check DX quota
		const quotaRes = await checkQuota(this.req.workspace, { resourceSize: deployEnvironmentData.size });
		if (!quotaRes.status) throw new Error(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed)
			throw new Error(`You've exceeded the limit amount of container size (${quotaRes.data.type} / Max size: ${quotaRes.data.limits.size}x).`);

		// Validate deploy environment data:

		// cluster
		if (!deployEnvironmentData.cluster) throw new Error(`Param "cluster" (Cluster's short name) is required.`);
		const cluster = await this.clusterSvc.findOne({ slug: deployEnvironmentData.cluster });
		if (!cluster) throw new Error(`Cluster "${deployEnvironmentData.cluster}" is not valid`);

		// namespace
		if (!deployEnvironmentData.namespace) deployEnvironmentData.namespace = `${projectSlug}-${env}`;

		// container registry
		if (!deployEnvironmentData.registry) throw new Error(`Param "registry" (Container Registry's slug) is required.`);
		const registry = await this.regSvc.findOne({ slug: deployEnvironmentData.registry });
		if (!registry) throw new Error(`Container Registry "${deployEnvironmentData.registry}" is not existed.`);

		// Domains & SSL certificate...
		if (!deployEnvironmentData.domains) deployEnvironmentData.domains = [];
		if (deployEnvironmentData.useGeneratedDomain) {
			const subdomain = `${projectSlug}-${appSlug}.${env}`;
			const {
				status,
				messages,
				data: { domain },
			} = await dxCreateDomain({ name: subdomain, data: cluster.primaryIP }, this.req.workspace.dx_key);
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
		let updatedApp = await this.updateOne(
			{ slug: appSlug },
			{
				[`deployEnvironment.${env}`]: deployEnvironmentData,
			}
		);
		// console.log("updatedApp :>> ", updatedApp);
		if (!updatedApp) throw new Error(`Failed to create "${env}" deploy environment.`);

		const appConfig = await getAppConfigFromApp(updatedApp);

		// if (
		// 	typeof buildNumber === "undefined" &&
		// 	updatedApp.deployEnvironment &&
		// 	updatedApp.deployEnvironment[env] &&
		// 	updatedApp.deployEnvironment[env].deploymentYaml
		// ) {
		// 	// generate deployment files and apply new config
		// 	const { BUILD_NUMBER: buildNumber } = fetchDeploymentFromContent(updatedApp.deployEnvironment[env].deploymentYaml);
		// 	console.log("buildNumber :>> ", buildNumber);
		// 	console.log("this.user :>> ", this.user);
		// }

		console.log("buildNumber :>> ", buildNumber);

		let deployment: GenerateDeploymentResult = await generateDeployment({
			appSlug: app.slug,
			env,
			username: this.req.user.slug,
			workspace: this.req.workspace,
			buildNumber,
		});

		const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = deployment;

		// update data to deploy environment:
		let serverDeployEnvironment = await getDeployEvironmentByApp(updatedApp, env);
		serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
		serverDeployEnvironment.deploymentYaml = deploymentContent;
		serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
		serverDeployEnvironment.updatedAt = new Date();
		serverDeployEnvironment.lastUpdatedBy = this.req.user.username;

		// Update {user}, {project}, {environment} to database before rolling out
		const updatedAppData = { deployEnvironment: updatedApp.deployEnvironment || {} } as QuerySelector<IApp> & IApp;
		updatedAppData.lastUpdatedBy = this.req.user.username;
		updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

		updatedApp = await this.updateOne({ slug: app.slug }, updatedAppData);
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
			const release = await createReleaseFromApp(updatedApp, env, buildNumber, {
				author: this.req.user,
				cliVersion: currentVersion(),
				workspace: this.req.workspace,
			});

			const result = await ClusterManager.rollout(release._id.toString());
			if (result.error) throw new Error(`Failed to roll out the release :>> ${result.error}.`);
		}

		return updatedApp;
	}

	async viewDeployEnvironmentLogs(app: IApp, env: string) {
		const deployEnvironment = app.deployEnvironment[env];

		const clusterSlug = deployEnvironment.cluster;
		const cluster = await this.clusterSvc.findOne({ slug: clusterSlug, workspace: app.workspace });
		if (!cluster) return;

		const { contextName: context } = cluster;

		const pods = await ClusterManager.getPodsByFilter(deployEnvironment.namespace, { context });
		if (isEmpty(pods)) return;

		const logs: { [pod: string]: string } = {};

		await Promise.all(
			pods.map(async (pod) => {
				const podLogs = await ClusterManager.logPod(pod.metadata.name, deployEnvironment.namespace, { context });
				logs[pod.metadata.name] = podLogs;
				return podLogs;
			})
		);

		return logs;
	}
}
