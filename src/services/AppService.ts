import { isEmpty, isString } from "lodash";
import path from "path";

import { CLI_CONFIG_DIR } from "@/config/const";
import type { IFramework, IGitProvider, IProject } from "@/entities";
import type { IApp } from "@/entities/App";
import { appSchema } from "@/entities/App";
import { type IQueryFilter, type IQueryOptions, type IQueryPagination } from "@/interfaces";
import type { AppInputSchema } from "@/interfaces/AppInterfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import getDeploymentName from "@/modules/deploy/generate-deployment-name";
import { getRepoURLFromRepoSSH } from "@/modules/git";
import GitProviderAPI from "@/modules/git/git-provider-api";
import { parseGitRepoDataFromRepoSSH, pullOrCloneGitRepoHTTP, repoSshToRepoURL } from "@/modules/git/git-utils";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import ClusterManager from "@/modules/k8s";
import { checkQuota } from "@/modules/workspace/check-quota";
import { pullOrCloneGitRepo } from "@/plugins";
import { uniqueStrings } from "@/plugins/array";
import { formatEnvVars } from "@/plugins/env-var";
import { basicUserFields } from "@/plugins/mask-sensitive-info";
import { MongoDB } from "@/plugins/mongodb";
import { makeSlug } from "@/plugins/slug";
import { containsSpecialCharacters } from "@/plugins/string";
import { checkAppPermissions, checkAppPermissionsByFilter, checkProjectAndAppPermissions, checkProjectPermissions } from "@/plugins/user-utils";

import BaseService from "./BaseService";

export class AppService extends BaseService<IApp> {
	constructor(ownership?: Ownership) {
		super(appSchema, ownership);
	}

	async create(
		data: Partial<AppInputSchema & IApp>,
		options?: IQueryOptions & IQueryPagination & { shouldCreateGitRepo?: boolean; force?: boolean }
	) {
		// validate
		let project: IProject;
		let appDto = { ...data };

		// ownership
		const { WorkspaceService, ProjectService, GitProviderService } = await import("./index");
		const wsSvc = new WorkspaceService();
		const projectSvc = new ProjectService();

		const workspace =
			this.ownership.workspace ||
			(data.workspace && MongoDB.isValidObjectId(data.workspace) ? await wsSvc.findOne({ _id: data.workspace }) : undefined);
		if (!workspace) throw new Error(`Workspace not found.`);

		// check dx quota
		const quotaRes = await checkQuota(workspace);
		if (!quotaRes.status) throw new Error(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed)
			throw new Error(`You've exceeded the limit amount of apps (${quotaRes.data.type} / Max. ${quotaRes.data.limits.apps} apps).`);

		// validate
		if (!data.project) throw new Error(`Project ID or slug or instance is required.`);
		if (!data.name) throw new Error(`App's name is required.`);
		if (containsSpecialCharacters(data.name)) throw new Error(`App's name should not contain special characters.`);

		// find parent project of this app
		if (MongoDB.isValidObjectId(data.project)) {
			project = await projectSvc.findOne({ _id: data.project });
		} else if (isString(data.project)) {
			project = await projectSvc.findOne({ slug: data.project });
		} else {
			throw new Error(`"project" is not a valid ID or slug.`);
		}

		if (!project) throw new Error(`Project "${data.project}" not found.`);
		appDto.projectSlug = project.slug;

		// check access permissions
		checkProjectPermissions(project, this.user);

		// framework
		if (!data.framework) data.framework = { name: "none", slug: "none", repoURL: "unknown", repoSSH: "unknown" } as IFramework;
		if ((data.framework as string) === "none")
			data.framework = { name: "none", slug: "none", repoURL: "unknown", repoSSH: "unknown" } as IFramework;
		appDto.framework = data.framework as IFramework;

		// git repo
		if (options.shouldCreateGitRepo) {
			// create repo if needed
			if (!data.gitProvider) throw new Error(`"gitProvider" is required.`);
			const gitSvc = new GitProviderService();
			const gitProvider = await gitSvc.findOne({ _id: data.gitProvider });
			if (!gitProvider) throw new Error(`Git provider not found.`);

			const repoSlug = `${project.slug}-${makeSlug(data.name)}`.toLowerCase();
			if (options?.force) {
				try {
					await GitProviderAPI.deleteGitRepository(gitProvider, gitProvider.org, repoSlug);
				} catch (e) {}
			}
			const newRepo = await GitProviderAPI.createGitRepository(gitProvider, { name: repoSlug, private: true });

			// assign to app data:
			appDto.git = {
				repoSSH: newRepo.ssh_url,
				repoURL: newRepo.repo_url,
				provider: gitProvider.type,
			};
		} else {
			if (isString(data.git)) {
				const gitData = parseGitRepoDataFromRepoSSH(data.git);
				if (!gitData) throw new Error(`Git repository information is not valid.`);

				data.git = {
					repoSSH: data.git as string,
					repoURL: getRepoURLFromRepoSSH(gitData.providerType, gitData.fullSlug),
					provider: gitData.providerType,
				};
			}
			if (!data.git) throw new Error(`Git info is required.`);
			appDto.git = data.git;
		}

		if (!appDto.ownerSlug) appDto.ownerSlug = this.user.username || this.ownership.owner.username;

		let newApp: IApp;

		try {
			newApp = await super.create(appDto, options);
			if (!newApp) throw new Error(`Unable to create new app: "${appDto.name}".`);
		} catch (e) {
			throw new Error(e.toString());
		}

		const newAppId = newApp._id;

		/**
		 * @deprecated
		 */
		// migrate app environment variables if needed (convert {Object} to {Array})
		// const migratedApp = await migrateAppEnvironmentVariables(newApp);
		// if (migratedApp) newApp = migratedApp;

		// add this new app to the project info
		if (project) {
			projectSvc.ownership = this.ownership;
			const projectApps = [...(project.apps || []), newAppId];
			const projectAppSlugs = uniqueStrings([...(project.appSlugs || []), newApp.slug]);
			project = await projectSvc.updateOne({ _id: project._id }, { apps: projectApps, appSlugs: projectAppSlugs });
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
		const { WorkspaceService, ProjectService, GitProviderService } = await import("./index");
		const projectSvc = new ProjectService();
		projectSvc.ownership = this.ownership;
		let project = await projectSvc.findOne({ isDefault: true, workspace: workspace._id }, options);
		if (!project) project = await projectSvc.create({ name: "Default", isDefault: true, workspace: workspace._id, owner: owner._id });

		// check permissions
		checkProjectPermissions(project, this.user);

		// git provider
		const gitSvc = new GitProviderService();
		const gitProvider = await gitSvc.findOne({ _id: gitProviderID });
		if (options?.isDebugging) console.log("createWithGitURL() > gitProvider :>> ", gitProvider);
		if (!gitProvider) throw new Error(`Unable to import git repo, git provider not found.`);

		// new repo slug
		const newRepoSlug = `${project.slug}-${makeSlug(repoSlug)}`.toLowerCase();
		const newRepoSSH = `git@${gitProvider.host}:${gitProvider.org}/${newRepoSlug}.git`;

		// check app is existed
		const existingApp = await this.findOne({ "git.repoSSH": newRepoSSH, workspace: workspace._id }, options);
		if (options?.isDebugging) console.log("createWithGitURL() > existingApp :>> ", existingApp);
		if (existingApp) {
			// [DANGEROUS] delete existing app when `--force` is specified:
			if (options?.force) {
				await this.delete({ "git.repoSSH": newRepoSSH, workspace: workspace._id });
			} else {
				if (options?.returnExisting) return existingApp;
				throw new Error(`Unable to import: app was existed with name "${existingApp.slug}" (Project: "${project.name}").`);
			}
		}

		// clone/pull that repo url
		const branch = options?.gitBranch || "main";
		const SOURCE_CODE_DIR = `cache/${project.slug}/${newRepoSlug}/${branch}`;
		const APP_DIR = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE_DIR);
		// try with "repoSSH" first, if failed, try "repoURL"...
		try {
			await pullOrCloneGitRepo(repoSSH, APP_DIR, branch, {
				isDebugging: options?.isDebugging,
				removeGitOnFinish: true,
				removeCIOnFinish: options.removeCI,
			});
		} catch (e) {
			const repoURL = repoSshToRepoURL(repoSSH);

			await pullOrCloneGitRepoHTTP(repoURL, APP_DIR, branch, {
				isDebugging: options?.isDebugging,
				removeGitOnFinish: true,
				removeCIOnFinish: options.removeCI,
				useAccessToken: {
					type: gitProvider.method === "basic" ? "Basic" : "Bearer",
					value: gitProvider.access_token,
				},
			});
		}

		if (options?.force) {
			try {
				await GitProviderAPI.deleteGitRepository(gitProvider, gitProvider.org, newRepoSlug);
			} catch (e) {}
		}

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
		const newApp = await this.create(appDto as Partial<AppInputSchema & IApp>, options);

		// add app & app slug to project
		projectSvc.ownership = this.ownership;
		await projectSvc.updateOne({ _id: project._id }, { $push: { apps: newApp._id, appSlugs: newApp.slug } }, { raw: true });

		return newApp;
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<IApp[]> {
		// check access permissions
		if (this.user?.allowAccess?.apps?.length) filter = { $or: [filter, { _id: { $in: this.user?.allowAccess?.apps } }] };

		const { status = false } = options || {};

		const apps = await super.find(filter, options, pagination);

		// if skip status checking, return apps
		if (!status) {
			return apps.map((app) => {
				if (app && app.deployEnvironment) {
					for (const env of Object.keys(app.deployEnvironment)) {
						if (app.deployEnvironment[env] && app.deployEnvironment[env].envVars) {
							app.deployEnvironment[env].envVars = formatEnvVars(app.deployEnvironment[env].envVars);
						}
					}
				}
				return app;
			});
		}

		// start checking status -> get cluster info
		const { ClusterService } = await import("./index");
		const clusterSvc = new ClusterService();
		const clusterFilter: any = {};
		if (filter?.workspace) clusterFilter.workspace = filter.workspace;
		const clusters = await clusterSvc.find(clusterFilter);

		// check app deploy environment's status in clusters
		const appsWithStatus = await Promise.all(
			apps
				.map(async (app) => {
					if (app && app.deployEnvironment) {
						for (const env of Object.keys(app.deployEnvironment)) {
							if (!app.deployEnvironment[env]) app.deployEnvironment[env] = { buildTag: "" };

							// environment variables
							if (app.deployEnvironment[env] && app.deployEnvironment[env].envVars)
								app.deployEnvironment[env].envVars = formatEnvVars(app.deployEnvironment[env].envVars);

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

	async update(filter: IQueryFilter<IApp>, data: any, options?: IQueryOptions): Promise<IApp[]> {
		// permissions
		await checkAppPermissionsByFilter(this, filter, this.user);

		// const allApps = await this.find({});
		// console.log("AppService > allApps :>> ", allApps);

		// if (options?.isDebugging) console.log("AppService > update > filter :>>", filter);
		let apps = await this.find(filter, data, options);
		if (isEmpty(apps)) {
			console.error(`AppService > update :>>`, { filter });
			throw new Error(`Apps not found.`);
		}
		// console.log("AppService > update > apps :>>", apps);

		const { ProjectService, WorkspaceService } = await import("./index");
		const projectSvc = new ProjectService(this.ownership);

		let project: IProject;

		if (data.project) {
			// find a project of this app
			if (MongoDB.isValidObjectId(data.project)) {
				project = await projectSvc.findOne({ _id: data.project });
			} else if (isString(data.project)) {
				project = await projectSvc.findOne({ slug: data.project });
			} else {
				throw new Error(`Param "project" is not a valid ID or slug.`);
			}

			if (!project) throw new Error(`Project "${data.project}" not found.`);
			data.projectSlug = project.slug;
			data.project = project._id;

			// add this app._id and app.slug to project.apps and project.appSlugs
			if (!project.apps) project.apps = [];
			if (!project.appSlugs) project.appSlugs = [];
			if (!project.apps.includes(data._id)) project.apps.push(data._id);
			if (!project.appSlugs.includes(data.slug)) project.appSlugs.push(data.slug);

			// update project
			apps.forEach(async (app) => {
				if (app._id && !project.apps.includes(app._id)) project.apps.push(app._id);
				if (app._id && !project.appSlugs.includes(app.slug)) project.appSlugs.push(app.slug);
				await projectSvc.updateOne({ _id: project._id }, { apps: project.apps, appSlugs: project.appSlugs });
			});
		}

		// delete deploy environment of this app
		if (data.deployEnvironment) {
			const [app] = apps;
			const wsId = app.workspace ? (MongoDB.isValidObjectId(app.workspace) ? app.workspace : (app.workspace as any)._id) : undefined;
			if (!wsId) throw new Error(`Workspace ID is not valid.`);

			const wsSvc = new WorkspaceService();
			const workspace = this.workspace || (await wsSvc.findOne({ _id: wsId }));
			if (!workspace) throw new Error(`Workspace not found.`);

			for (const env of Object.keys(data.deployEnvironment)) {
				const deployEnvironment = data.deployEnvironment[env];
				if (deployEnvironment) {
					// check dx quota
					const { size } = deployEnvironment;
					if (size) {
						const quotaRes = await checkQuota(workspace, { resourceSize: size });
						if (!quotaRes.status) throw new Error(quotaRes.messages.join(". "));
						if (quotaRes.data && quotaRes.data.isExceed) {
							throw new Error(`You've exceeded the limit amount of container size.`);
							// throw new Error(
							// 	`You've exceeded the limit amount of container size (${quotaRes.data.type} / Max size: ${quotaRes.data.limits.size}x).`
							// );
						}
					}

					// IMPORTANT: Only update specific paths
					for (const key of Object.keys(deployEnvironment)) {
						data[`deployEnvironment.${env}.${key}`] = deployEnvironment[key];
					}
				}
			}
			delete data.deployEnvironment;
		}

		// if (options?.isDebugging) console.log("AppService > update > data :>>", data);
		apps = await super.update(filter, data, options);
		// if (options?.isDebugging) console.log("AppService > update > [UPDATED] apps :>>", apps);
		return apps;
	}

	async updateOne(filter: IQueryFilter<IApp>, data: any, options?: IQueryOptions): Promise<IApp> {
		const [app] = await this.update(filter, data, options);
		return app;
	}

	async delete(filter?: IQueryFilter<IApp>, options?: IQueryOptions) {
		// permissions
		await checkProjectAndAppPermissions(this, filter, this.user);

		const app = await this.findOne(filter, { populate: ["project"] });
		if (!app) throw new Error(`App not found.`);

		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();

		if (app.deployEnvironment) {
			// take down all deploy environments of this app
			Object.entries(app.deployEnvironment).map(async ([env, deployEnvironment]) => {
				// take down environment
				if (!isEmpty(deployEnvironment)) {
					await deployEnvSvc.takeDownDeployEnvironment(app, env).catch((e) => {
						console.error(`AppService > delete() > deleteDeployEnvironment() :>>`, e);
					});
				}
			});
		}

		// remove this app ID from project.apps
		const { ProjectService } = await import("@/services");
		const project = await new ProjectService().updateOne(
			{
				_id: (app.project as IProject)._id,
			},
			{
				$pull: { apps: app._id, appSlugs: app.slug },
			},
			{ raw: true }
		);

		return super.delete(filter, options);
	}

	async softDelete(filter?: IQueryFilter<IApp>, options?: IQueryOptions) {
		// permissions
		await checkProjectAndAppPermissions(this, filter, this.user);

		const app = await this.findOne(filter, options);
		if (!app) throw new Error(`Unable to delete: App not found.`);

		// take down all deploy environments of this app
		try {
			await this.takeDown(app, options);
		} catch (e) {
			// ignore on error
			console.error(e);
		}

		return super.softDelete(filter, options);
	}

	async deleteGitRepo(filter?: IQueryFilter<IApp>, options?: IQueryOptions) {
		const app = await this.findOne(filter, { populate: ["gitProvider"] });
		if (!app) throw new Error(`Unable to delete: App not found.`);

		// permissions
		checkAppPermissions(app, this.user);

		const provider = app.gitProvider as IGitProvider;
		const repoData = await parseGitRepoDataFromRepoSSH(app.git.repoSSH);
		if (!repoData) throw new Error(`Unable to read repo data of "${app.slug}" app: ${app.git.repoSSH}`);

		// delete git repo via API
		const { GitProviderService } = await import("./index");
		const gitSvc = new GitProviderService(this.ownership);

		return gitSvc.deleteGitRepository(provider, repoData.repoSlug, options);
	}

	async takeDown(app: IApp, options?: IQueryOptions) {
		// validate
		if (!app.deployEnvironment) throw new Error(`Unable to take down "${app.slug}" app, no deploy environtments found.`);

		// initialize
		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();

		// permissions
		checkAppPermissions(app, this.user);

		// take down all deploy environments
		const deployEnvs = Object.keys(app.deployEnvironment);
		console.log("AppSvc.takeDown() > deployEnvs :>> ", deployEnvs);
		await Promise.all(deployEnvs.map((env) => deployEnvSvc.takeDownDeployEnvironment(app, env, options)));

		return app;
	}

	async archiveApp(app: IApp, ownership?: Ownership) {
		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();

		// permissions
		checkAppPermissions(app, this.user);

		// take down all deploy environments
		const deployEnvs = Object.keys(app.deployEnvironment);
		await Promise.all(deployEnvs.map((env) => deployEnvSvc.takeDownDeployEnvironment(app, env)));

		// update database
		const archivedApp = await this.updateOne({ _id: app._id }, { archivedAt: new Date() });
		return archivedApp;
	}

	async unarchiveApp(app: IApp, ownership?: Ownership) {
		// permissions
		checkAppPermissions(app, this.user);

		// update database
		const unarchivedApp = await this.updateOne({ _id: app._id }, { $unset: { archivedAt: true } }, { raw: true });
		return unarchivedApp;
	}

	/**
	 * Get all users that participated in this app.
	 */
	async getParticipants(app: IApp, options?: IQueryOptions & IQueryPagination) {
		const { BuildService, UserService } = await import("./index");
		const buildSvc = new BuildService();
		const userSvc = new UserService();

		buildSvc.ownership = this.ownership;
		const listOwners = await buildSvc.distinct("owner", { app: app._id });
		const ids = listOwners.map((item) => item.owner);
		return userSvc.find({ _id: { $in: ids } }, { select: basicUserFields }, options);
	}
}
