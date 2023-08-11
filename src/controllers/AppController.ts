import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "@tsoa/runtime";
import { isJSON } from "class-validator";
import { log, logWarn } from "diginext-utils/dist/xconsole/log";
import { isArray, isBoolean, isEmpty, isNumber, isUndefined } from "lodash";

import type { IApp, IBuild, ICluster, IProject } from "@/entities";
import { AppDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPatchQueryParams, IPostQueryParams } from "@/interfaces";
import type { AppInputSchema } from "@/interfaces/AppInterfaces";
import { CreateEnvVarsDto, DeployEnvironmentData, UpdateEnvVarsDto } from "@/interfaces/AppInterfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import { getDeployEvironmentByApp } from "@/modules/apps/get-app-environment";
import { createReleaseFromApp } from "@/modules/build/create-release-from-app";
import type { GenerateDeploymentResult } from "@/modules/deploy";
import { fetchDeploymentFromContent, generateDeployment } from "@/modules/deploy";
import getDeploymentName from "@/modules/deploy/generate-deployment-name";
import { dxCreateDomain } from "@/modules/diginext/dx-domain";
import ClusterManager from "@/modules/k8s";
import { checkQuota } from "@/modules/workspace/check-quota";
import { currentVersion } from "@/plugins";
import { makeSlug } from "@/plugins/slug";
import { ProjectService } from "@/services";

import { AppService } from "../services/AppService";
import BaseController from "./BaseController";

@Tags("App")
@Route("app")
export default class AppController extends BaseController<IApp, AppService> {
	constructor() {
		super(new AppService());
	}

	/**
	 * List of apps
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: IGetQueryParams) {
		let apps = await this.service.find(this.filter, this.options, this.pagination);
		// console.log("apps :>> ", apps);
		if (isEmpty(apps)) return respondSuccess({ data: [] });

		// TODO: remove this code after all "deployEnvironment.envVars" of apps are {Array}
		// convert "envVars" Object to Array (if needed)
		apps = apps
			.map((app) => {
				if (app && app.deployEnvironment)
					Object.entries(app.deployEnvironment).map(([env, deployEnvironment]) => {
						if (deployEnvironment) {
							const envVars = deployEnvironment.envVars;
							if (envVars && !isArray(envVars)) {
								/**
								 * {Object} envVars
								 * @example
								 * {
								 * 		"0": { name: "NAME", value: "VALUE" },
								 * 		"1": { name: "NAME", value: "VALUE" },
								 * 		...
								 * }
								 */
								const convertedEnvVars = [];
								Object.values(envVars).map((envVar) => convertedEnvVars.push(envVar));
								app.deployEnvironment[env].envVars = convertedEnvVars;
							}
						}
					});
				return app;
			})
			.filter((app) => app !== null && app !== undefined);

		return respondSuccess({ data: apps });
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: AppInputSchema & Partial<IApp>, @Queries() queryParams?: IPostQueryParams) {
		try {
			const newApp = await this.service.create(body, { ...this.options, force: body.force, shouldCreateGitRepo: body.shouldCreateGitRepo });

			delete body.force;
			delete body.shouldCreateGitRepo;

			return respondSuccess({ data: newApp });
		} catch (e) {
			return respondFailure(`Unable to create new app: ${e}`);
		}
	}

	/**
	 * Create new app from a git repo SSH url
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/ssh-url")
	async createFromSshURL(
		@Body()
		body: {
			/**
			 * Git repo SSH url
			 * @example git@github.com:digitopvn/diginext.git
			 */
			sshUrl: string;
			/**
			 * Git provider ID to host the new repo of this app
			 */
			gitProviderID: string;
			/**
			 * ### CAUTION
			 * If `TRUE`, it will delete existing git repo and create a new one.
			 */
			force?: boolean;
		}
	) {
		try {
			const newApp = await this.service.createWithGitURL(
				body.sshUrl,
				body.gitProviderID,
				{ workspace: this.workspace, owner: this.user },
				{ force: body.force }
			);
			return respondSuccess({ data: newApp });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	/**
	 * Import a git repo SSH url & create new app from it
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/import-git")
	async importFromGitSshURL(
		@Body()
		body: {
			/**
			 * App's name
			 */
			name?: string;
			/**
			 * Git repo SSH url
			 * @example git@github.com:digitopvn/diginext.git
			 */
			sshUrl: string;
			/**
			 * Git provider ID to host the new repo of this app
			 */
			gitProviderID: string;
			/**
			 * Select git branch to pull
			 */
			gitBranch?: string;
			/**
			 * Project ID of this app
			 */
			projectID?: string;
			/**
			 * `DANGER`
			 * ---
			 * Delete app and git repo if they were existed.
			 * @default false
			 */
			force?: boolean;
		}
	) {
		try {
			const newApp = await this.service.createWithGitURL(
				body.sshUrl,
				body.gitProviderID,
				{ workspace: this.workspace, owner: this.user },
				{
					force: body.force,
					gitBranch: body.gitBranch,
					isDebugging: false,
					removeCI: true,
				}
			);
			return respondSuccess({ data: newApp });
		} catch (e) {
			respondFailure(`Unable to import: ${e}`);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: AppDto, @Queries() queryParams?: IPatchQueryParams) {
		let project: IProject,
			projectSvc = new ProjectService();

		if (body.project) {
			project = await projectSvc.findOne({ _id: body.project });
			if (!project) return { status: 0, messages: [`Project "${body.project}" not found.`] } as ResponseData;
			body.projectSlug = project.slug;
		}

		if (body.deployEnvironment) {
			for (const env of Object.keys(body.deployEnvironment)) {
				// check dx quota
				const size = body.deployEnvironment[env].size;
				if (size) {
					const quotaRes = await checkQuota(this.workspace, { resourceSize: size });
					if (!quotaRes.status) return respondFailure(quotaRes.messages.join(". "));
					if (quotaRes.data && quotaRes.data.isExceed)
						return respondFailure(
							`You've exceeded the limit amount of container size (${quotaRes.data.type} / Max size: ${quotaRes.data.limits.size}x).`
						);
				}

				// magic -> not delete other deploy environment & previous configuration
				for (const key of Object.keys(body.deployEnvironment[env])) {
					body[`deployEnvironment.${env}.${key}`] = body.deployEnvironment[env][key];
				}

				delete body.deployEnvironment;
			}
		}

		let apps: IApp[];
		try {
			apps = await this.service.update(this.filter, body, this.options);
			if (isEmpty(apps)) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		} catch (e) {
			return { status: 0, messages: [e.message] } as ResponseData;
		}

		return respondSuccess({ data: apps });
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	async delete(@Queries() queryParams?: IDeleteQueryParams) {
		const app = await this.service.findOne(this.filter, { populate: ["project"] });

		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();

		if (app.deployEnvironment)
			Object.entries(app.deployEnvironment).map(async ([env, deployEnvironment]) => {
				// take down environment
				if (!isEmpty(deployEnvironment)) {
					await deployEnvSvc.takeDownDeployEnvironment(app, env);
				}
			});

		// remove this app ID from project.apps
		const [project] = await new ProjectService().update(
			{
				_id: (app.project as IProject)._id,
			},
			{
				$pull: { apps: app._id },
			},
			{ raw: true }
		);
		return super.delete();
	}

	/**
	 * List of participants in an app
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/participants")
	async participants(@Queries() queryParams?: IGetQueryParams) {
		const app = await this.service.findOne(this.filter);
		if (!app) return respondFailure(`App not found.`);

		try {
			const participants = await this.service.getParticipants(app, this.options);
			return respondSuccess({ data: participants });
		} catch (e) {
			return respondFailure(`Unable to get participants: ${e}`);
		}
	}

	/**
	 * Take down all deploy environments of this app on the clusters, then mark this app as "archived" in database.
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/archive")
	async archiveApp(@Queries() queryParams?: IGetQueryParams) {
		const app = await this.service.findOne(this.filter, this.options);
		if (!app) return respondFailure(`Unable to archive: app not found.`);

		try {
			const archivedApp = await this.service.archiveApp(app, this.ownership);
			return respondSuccess({ data: archivedApp });
		} catch (e) {
			return respondFailure(`Unable to archive this app: ${e}`);
		}
	}

	/**
	 * Mark this app as "unarchived" in database.
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/unarchive")
	async unarchiveApp(@Queries() queryParams?: IGetQueryParams) {
		const app = await this.service.findOne(this.filter, this.options);
		if (!app) return respondFailure(`Unable to archive: app not found.`);

		try {
			const unarchivedApp = await this.service.unarchiveApp(app, this.ownership);
			return respondSuccess({ data: unarchivedApp });
		} catch (e) {
			return respondFailure(`Unable to archive this app: ${e}`);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/config")
	async getAppConfig(@Queries() queryParams?: { slug: string }) {
		const app = await this.service.findOne(this.filter, { populate: ["project", "owner", "workspace"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

		const appConfig = getAppConfigFromApp(app);

		let result = { status: 1, data: appConfig, messages: [] };
		return result;
	}

	/**
	 * Get new deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/environment")
	async getDeployEnvironmentV2(
		@Queries()
		queryParams: {
			/**
			 * App slug
			 */
			slug: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		}
	) {
		const { slug, env } = this.filter;
		if (!slug) return respondFailure({ msg: `App slug is required.` });
		if (!env) return respondFailure({ msg: `Deploy environment name is required.` });

		const app = await this.service.findOne({ slug });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app) return respondFailure({ msg: `App "${slug}" not found.` });
		if (!app.deployEnvironment[env]) return respondFailure({ msg: `App "${slug}" doesn't have any deploy environment named "${env}".` });

		const deployEnvironment = app.deployEnvironment[env];
		let result = respondSuccess({ data: deployEnvironment });
		return result;
	}

	/**
	 * [V2] Get new deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/deploy_environment")
	async getDeployEnvironment(
		@Queries()
		queryParams: {
			/**
			 * App slug
			 */
			slug: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		}
	) {
		const { slug, env } = this.filter;
		if (!slug) return respondFailure({ msg: `App slug is required.` });
		if (!env) return respondFailure({ msg: `Deploy environment name is required.` });

		const app = await this.service.findOne({ slug });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app) return respondFailure({ msg: `App "${slug}" not found.` });
		if (!app.deployEnvironment[env]) return respondFailure({ msg: `App "${slug}" doesn't have any deploy environment named "${env}".` });

		const deployEnvironment = app.deployEnvironment[env];
		let result = respondSuccess({ data: deployEnvironment });
		return result;
	}

	/**
	 * [V2] Create new deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/deploy_environment")
	async createDeployEnvironmentV2(
		/**
		 * `REQUIRES`
		 * ---
		 * Deploy environment configuration
		 */
		@Body()
		body: DeployEnvironmentData,
		@Queries()
		queryParams?: {
			/**
			 * App slug
			 */
			slug: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		}
	) {
		const { slug, env } = this.filter;
		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();
		return deployEnvSvc.createDeployEnvironment(slug, { env, deployEnvironmentData: body }, this.ownership);
	}

	/**
	 * [V2] Update new deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/deploy_environment")
	async updateDeployEnvironmentV2(
		/**
		 * `REQUIRES`
		 * ---
		 * Deploy environment configuration
		 */
		@Body()
		body: DeployEnvironmentData,
		@Queries()
		queryParams?: {
			/**
			 * App slug
			 */
			slug: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		}
	) {
		const { slug, env } = this.filter;
		return this.updateDeployEnvironment({ appSlug: slug, env, deployEnvironmentData: body });
	}

	/**
	 * [V2] Update new deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/deploy_environment")
	async deleteDeployEnvironmentV2(
		@Queries()
		queryParams?: {
			/**
			 * App slug
			 */
			slug: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		}
	) {
		const { slug, env } = this.filter;
		return this.deleteDeployEnvironment({ slug, env });
	}

	/**
	 * Create new deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/environment")
	async createDeployEnvironment(
		@Body()
		body: {
			/**
			 * `REQUIRES`
			 * ---
			 * App slug
			 */
			appSlug: string;
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
		@Queries() queryParams?: IPostQueryParams
	) {
		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();
		const app = await deployEnvSvc.createDeployEnvironment(body.appSlug, body, this.ownership);
		return respondSuccess({ data: app });
	}

	/**
	 * Create new deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/environment")
	async updateDeployEnvironment(
		@Body()
		body: {
			/**
			 * `REQUIRES`
			 * ---
			 * App slug
			 */
			appSlug: string;
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
		@Queries() queryParams?: IPostQueryParams
	) {
		//
		const { DB } = await import("@/modules/api/DB");
		const { appSlug, env, deployEnvironmentData } = body;
		if (!appSlug) return respondFailure({ msg: `App slug is required.` });
		if (!env) return respondFailure({ msg: `Deploy environment name is required.` });
		if (!deployEnvironmentData) return respondFailure({ msg: `Deploy environment configuration is required.` });

		// get app data:
		const app = await DB.findOne("app", { slug: appSlug }, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.project) return respondFailure({ msg: `This app is orphan, apps should belong to a project.` });
		if (!deployEnvironmentData.imageURL) respondFailure({ msg: `Build image URL is required.` });

		const currentDeployEnvData = app.deployEnvironment[env];

		// build number
		if (!deployEnvironmentData.buildTag) deployEnvironmentData.buildTag = app.deployEnvironment[env].buildTag;

		if (!deployEnvironmentData.buildTag) {
			const releaseFilter = { appSlug: app.slug, buildStatus: "success", env, active: true };
			console.log("updateDeployEnvironment() > releaseFilter :>> ", releaseFilter);

			let latestRelease = await DB.findOne("release", releaseFilter, { populate: ["build"], order: { createdAt: -1 } });
			// "sometime" there are no "active" release, so just get the "success" release instead :)
			if (!latestRelease) {
				delete releaseFilter.active;
				latestRelease = await DB.findOne("release", releaseFilter, { populate: ["build"], order: { createdAt: -1 } });
			}
			if (!latestRelease) return respondFailure(`updateDeployEnvironment() > Release not found (app: "${app.slug}" - env: "${env}")`);

			const latestBuild = latestRelease.build as IBuild;
			if (!latestRelease) return respondFailure(`updateDeployEnvironment() > Latest build not found (app: "${app.slug}" - env: "${env}")`);
			deployEnvironmentData.buildTag = latestBuild.tag;
		}

		if (!deployEnvironmentData.buildTag) return respondFailure({ msg: `Build number (image's tag) is required.` });

		// finish checking build number
		const { buildTag } = deployEnvironmentData;

		const project = app.project as IProject;
		const { slug: projectSlug } = project;

		// Check DX quota
		if (deployEnvironmentData.size) {
			const quotaRes = await checkQuota(this.workspace, { resourceSize: deployEnvironmentData.size });
			if (!quotaRes.status) return respondFailure(quotaRes.messages.join(". "));
			if (quotaRes.data && quotaRes.data.isExceed)
				return respondFailure(
					`You've exceeded the limit amount of container size (${quotaRes.data.type} / Max size: ${quotaRes.data.limits.size}x).`
				);
		}

		// Validate deploy environment data:

		// cluster
		let cluster: ICluster | undefined;
		if (deployEnvironmentData.cluster) cluster = await DB.findOne("cluster", { slug: deployEnvironmentData.cluster });
		if (!cluster && currentDeployEnvData.cluster) cluster = await DB.findOne("cluster", { slug: currentDeployEnvData.cluster });

		// namespace
		const namespace = deployEnvironmentData.namespace;
		if (cluster && namespace) {
			// Check if namespace is existed...
			const isNamespaceExisted = await ClusterManager.isNamespaceExisted(namespace, { context: cluster.contextName });
			if (isNamespaceExisted)
				return respondFailure({
					msg: `Namespace "${namespace}" was existed in "${cluster.name}" cluster, please choose different name or leave empty to use generated namespace name.`,
				});
		}

		// container registry
		if (deployEnvironmentData.registry) {
			const registry = await DB.findOne("registry", { slug: deployEnvironmentData.registry });
			if (!registry) return respondFailure({ msg: `Container Registry "${deployEnvironmentData.registry}" is not existed.` });
		}

		// Domains & SSL certificate...
		// if (!deployEnvironmentData.domains) deployEnvironmentData.domains = [];
		if (deployEnvironmentData.useGeneratedDomain) {
			if (!cluster) return respondFailure(`Param "cluster" must be specified if you want to use "useGeneratedDomain".`);

			const subdomain = `${projectSlug}-${appSlug}.${env}`;
			const {
				status,
				messages,
				data: { domain },
			} = await dxCreateDomain({ name: subdomain, data: cluster.primaryIP }, this.workspace.dx_key);

			if (!status) logWarn(`[APP_CONTROLLER] ${messages.join(". ")}`);
			deployEnvironmentData.domains = status ? [domain, ...deployEnvironmentData.domains] : deployEnvironmentData.domains;
		}

		// Exposing ports, enable/disable CDN, and select Ingress type
		if (!isUndefined(deployEnvironmentData.port)) {
			if (!isNumber(deployEnvironmentData.port)) return respondFailure({ msg: `Param "port" must be a number.` });
		}
		if (!isUndefined(deployEnvironmentData.cdn) && !isBoolean(deployEnvironmentData.cdn)) {
			return respondFailure({ msg: `Param "cdn" must be a boolean.` });
		}
		// deployEnvironmentData.ingress = "nginx";

		deployEnvironmentData.lastUpdatedBy = this.user.slug;

		// create deploy environment in the app:
		let updateDeployEnvData: any = {};
		Object.keys(deployEnvironmentData).map((key) => (updateDeployEnvData[`deployEnvironment.${env}.${key}`] = deployEnvironmentData[key]));

		let updatedApp = await this.service.updateOne({ slug: appSlug }, updateDeployEnvData);
		// console.log("updatedApp :>> ", updatedApp);
		if (!updatedApp) return respondFailure({ msg: `Failed to create "${env}" deploy environment.` });

		const appConfig = await getAppConfigFromApp(updatedApp);

		if (!deployEnvironmentData.tlsSecret) {
			if (appConfig.deployEnvironment[env].domains?.length > 0 && !appConfig.deployEnvironment[env].tlsSecret) {
				if (deployEnvironmentData.ssl === "letsencrypt") {
					deployEnvironmentData.tlsSecret = makeSlug(deployEnvironmentData.domains[0]);
				} else if (deployEnvironmentData.ssl === "custom") {
					if (!deployEnvironmentData.tlsSecret) deployEnvironmentData.tlsSecret = makeSlug(deployEnvironmentData.domains[0]);
				} else {
					deployEnvironmentData.tlsSecret = "";
				}
			}

			// update app again
			updateDeployEnvData = {};
			Object.keys(deployEnvironmentData).map((key) => (updateDeployEnvData[`deployEnvironment.${env}.${key}`] = deployEnvironmentData[key]));
			updatedApp = await this.service.updateOne({ slug: appSlug }, updateDeployEnvData);
		}

		// generate deployment files and apply new config
		let deployment: GenerateDeploymentResult = await generateDeployment({
			appSlug: app.slug,
			env,
			username: this.user.slug,
			workspace: this.workspace,
			buildTag: buildTag,
		});

		const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = deployment;

		// update data to deploy environment:
		let serverDeployEnvironment = await getDeployEvironmentByApp(updatedApp, env);
		serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
		serverDeployEnvironment.deploymentYaml = deploymentContent;
		serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
		serverDeployEnvironment.updatedAt = new Date();
		serverDeployEnvironment.lastUpdatedBy = this.user.username;

		// Update {user}, {project}, {environment} to database before rolling out
		const updatedAppData = { deployEnvironment: updatedApp.deployEnvironment || {} } as IApp;
		updatedAppData.lastUpdatedBy = this.user.username;
		updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

		updatedApp = await DB.updateOne("app", { slug: app.slug }, updatedAppData);
		if (!updatedApp) return respondFailure("Unable to update " + env + " environment of " + app.slug + "app.");

		if (!cluster) return respondSuccess({ data: updatedApp.deployEnvironment[env] });

		// get workloads on cluster
		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();
		let workloads = await ClusterManager.getDeploysByFilter(serverDeployEnvironment.namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${mainAppName}`,
		});

		// Fallback support for deprecated mainAppName
		const deprecatedWorkloads = await ClusterManager.getDeploysByFilter(serverDeployEnvironment.namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${deprecatedMainAppName}`,
		});
		if (deprecatedWorkloads?.length > 0) workloads.push(...deprecatedWorkloads);

		console.log("AppController > updateDeployEnvironment() > workloads :>> ", workloads);
		console.log("AppController > updateDeployEnvironment() > workloads.length :>> ", workloads?.length);

		// if (workloads && workloads.length > 0) {
		console.log(`AppController > updateDeployEnvironment() > Applying new deployment yaml...`);

		// create new release and roll out
		const release = await createReleaseFromApp(updatedApp, env, buildTag, {
			author: this.user,
			cliVersion: currentVersion(),
			workspace: this.workspace,
		});

		// const result = await ClusterManager.rollout(release._id.toString());
		// if (result.error) return respondFailure(`Failed to roll out the release :>> ${result.error}.`);

		// apply deployment YAML
		const applyResult = await ClusterManager.kubectlApplyContent(deployment.deploymentContent, { context: cluster.contextName });
		console.log("AppController > updateDeployEnvironment() > Applied deployment yaml :>> ", applyResult);

		// delete deprecated workloads
		if (deprecatedWorkloads?.length > 0) {
			const deleteResult = await Promise.all(
				deprecatedWorkloads.map((workload) =>
					ClusterManager.deleteDeploy(workload.metadata.name, workload.metadata.namespace, { context: cluster.contextName })
				)
			);
			console.log("AppController > updateDeployEnvironment() > Deleted deprecated deployments :>> ", deleteResult);
		}
		// }

		return respondSuccess({ data: updatedApp.deployEnvironment[env] });
	}

	/**
	 * Delete a deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/environment")
	async deleteDeployEnvironment(
		@Body()
		body?: {
			/**
			 * App's ID (no need `slug` if using `id` or `_id`)
			 */
			_id?: string;
			/**
			 * [alias] App's ID (no need `slug` if using `id` or `_id`)
			 */
			id?: string;
			/**
			 * App's slug (no need `id` or `_id` if using `slug`)
			 */
			slug?: string;
			/**
			 * Short name of deploy environment
			 * @example "dev", "prod",...
			 */
			env?: string;
		}
	) {
		let result = { status: 1, data: {}, messages: [] } as ResponseData & { data: IApp };

		// input validation
		let { _id, id, slug, env } = body;
		if (!id && _id) id = _id;
		if (!id && !slug) return respondFailure(`App "id" or "slug" is required.`);
		if (!env) return respondFailure(`App "env" is required.`);

		// find the app
		const appFilter = typeof id != "undefined" ? { _id: id } : { slug };
		const app = await this.service.findOne(appFilter, { populate: ["project"] });

		// check if the environment is existed
		if (!app) return respondFailure({ msg: `App not found.` });

		// take down the deploy environment
		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();
		await deployEnvSvc.takeDownDeployEnvironment(app, env.toString());

		// update the app (delete the deploy environment)
		const updatedApp = await this.service.updateOne(
			appFilter,
			{
				$unset: { [`deployEnvironment.${env}`]: true },
			},
			{ raw: true }
		);

		if (this.options.isDebugging) log(`[BaseController] deleted Environment`, { appFilter }, ` :>>`, { updatedApp });

		// respond the results
		return respondSuccess({ data: updatedApp });
	}

	/**
	 * Get list of variables on the deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/environment/variables")
	async getEnvVarsOnDeployEnvironment(@Queries() queryParams?: { slug: string; env: string }) {
		const { slug, env } = this.filter;
		if (!slug) return { status: 0, messages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };

		const app = await this.service.findOne({ slug });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

		const envVars = app.deployEnvironment[env].envVars || [];

		let result = { status: 1, data: envVars, messages: [] };
		return result;
	}

	/**
	 * Create new variables on the deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/environment/variables")
	async createEnvVarsOnDeployEnvironment(
		@Body()
		body: CreateEnvVarsDto,
		@Queries() queryParams?: IPostQueryParams
	) {
		const { DB } = await import("@/modules/api/DB");

		let { slug, env, envVars } = body;
		if (!slug) return { status: 0, messages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };
		if (!envVars) return { status: 0, messages: [`Array of environment variables (envVars) is required.`] };
		// if (!isJSON(envVars)) return { status: 0, messages: [`Array of variables (envVars) is not a valid JSON.`] };

		const app = await this.service.findOne({ ...this.filter, slug }, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		const deployEnvironment = app.deployEnvironment[env];
		if (!deployEnvironment) return respondFailure(`Deploy environment "${env}" is not existed in "${slug}" app.`);
		if (!deployEnvironment.namespace) return respondFailure(`Namespace not existed in deploy environment "${env}" of "${slug}" app.`);
		if (!deployEnvironment.cluster) return respondFailure(`Cluster not existed in deploy environment "${env}" of "${slug}" app.`);

		const { namespace, cluster: clusterSlug } = deployEnvironment;
		const cluster = await DB.findOne("cluster", { slug: clusterSlug });
		if (!cluster) return respondFailure(`Cluster not found: "${clusterSlug}"`);

		const newEnvVars = isJSON(envVars)
			? (JSON.parse(envVars) as KubeEnvironmentVariable[])
			: isArray(envVars)
			? (envVars as unknown as KubeEnvironmentVariable[])
			: [];

		// console.log("updateEnvVars :>> ", updateEnvVars);
		let [updatedApp] = await this.service.update(
			{ slug },
			{
				[`deployEnvironment.${env}.envVars`]: newEnvVars,
			}
		);
		if (!updatedApp) return { status: 0, messages: [`Failed to create "${env}" deploy environment.`] };

		// generate deployment files and apply new config
		if (updatedApp.deployEnvironment && updatedApp.deployEnvironment[env] && updatedApp.deployEnvironment[env].deploymentYaml) {
			const { BUILD_TAG } = fetchDeploymentFromContent(updatedApp.deployEnvironment[env].deploymentYaml);

			let deployment: GenerateDeploymentResult = await generateDeployment({
				appSlug: app.slug,
				env,
				username: this.user.slug,
				workspace: this.workspace,
				buildTag: BUILD_TAG,
			});

			const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = deployment;

			// update data to deploy environment:
			let serverDeployEnvironment = await getDeployEvironmentByApp(updatedApp, env);
			serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
			serverDeployEnvironment.deploymentYaml = deploymentContent;
			serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
			serverDeployEnvironment.updatedAt = new Date();
			serverDeployEnvironment.lastUpdatedBy = this.user.username;

			// Update {user}, {project}, {environment} to database before rolling out
			const updatedAppData = { deployEnvironment: updatedApp.deployEnvironment || {} } as IApp;
			updatedAppData.lastUpdatedBy = this.user.username;
			updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

			updatedApp = await DB.updateOne("app", { slug: app.slug }, updatedAppData);
			if (!updatedApp) return respondFailure("Unable to apply new domain configuration for " + env + " environment of " + app.slug + "app.");
		}

		// Set environment variables to deployment in the cluster
		// if the workload has been deployed before -> update the environment variables
		let workloads = await ClusterManager.getDeploysByFilter(namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${mainAppName}`,
		});
		// Fallback support for deprecated mainAppName
		if (!workloads || workloads.length === 0) {
			workloads = await ClusterManager.getDeploysByFilter(namespace, {
				context: cluster.contextName,
				filterLabel: `main-app=${deprecatedMainAppName}`,
			});
		}

		if (workloads && workloads.length > 0) {
			try {
				const setEnvVarsRes = await ClusterManager.setEnvVarByFilter(newEnvVars, namespace, {
					context: cluster.contextName,
					filterLabel: `main-app=${mainAppName}`,
				});
				console.log("setEnvVarsRes :>> ", setEnvVarsRes);
			} catch (e) {
				return respondFailure(e.toString());
			}
		}

		return respondSuccess({ data: updatedApp.deployEnvironment[env].envVars });
	}

	/**
	 * Update environment variables on the deploy environment.
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/environment/variables")
	async updateEnvVarsOnDeployEnvironment(@Body() body: UpdateEnvVarsDto, @Queries() queryParams?: IPostQueryParams) {
		let { slug, env, envVars } = body;
		if (!slug) return respondFailure(`App slug (slug) is required.`);
		if (!env) return respondFailure(`Deploy environment name (env) is required.`);
		if (!envVars) return respondFailure(`Array of environment variables (envVars) is required.`);

		const app = await this.service.findOne({ ...this.filter, slug }, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

		try {
			const { DeployEnvironmentService } = await import("@/services");
			const deployEnvSvc = new DeployEnvironmentService(this.ownership);
			const data = await deployEnvSvc.updateEnvVars(app, env, envVars);

			return respondSuccess({ data: data.app, msg: data.message });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	/**
	 * Delete variables on the deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/environment/variables")
	async deleteEnvVarsOnDeployEnvironment(
		@Body()
		body: {
			/**
			 * App slug
			 */
			slug: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		let { slug, env } = body;
		if (!slug) return { status: 0, messages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };

		const app = await this.service.findOne({ ...this.filter, slug }, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${slug}" doesn't have any deploy environment named "${env}".`] };
		if (isEmpty(app.deployEnvironment[env]))
			return { status: 0, messages: [`This deploy environment (${env}) of "${slug}" app doesn't have any environment variables.`] };

		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();
		const envVars = app.deployEnvironment[env].envVars;
		const deployEnvironment = app.deployEnvironment[env];

		if (!deployEnvironment) return respondFailure(`Deploy environment "${env}" is not existed in "${slug}" app.`);
		if (!deployEnvironment.namespace) return respondFailure(`Namespace not existed in deploy environment "${env}" of "${slug}" app.`);
		if (!deployEnvironment.cluster) return respondFailure(`Cluster not existed in deploy environment "${env}" of "${slug}" app.`);

		const { namespace, cluster: clusterSlug } = deployEnvironment;

		const { DB } = await import("@/modules/api/DB");
		const cluster = await DB.findOne("cluster", { slug: clusterSlug });
		if (!cluster) return respondFailure(`Cluster not found: "${clusterSlug}"`);

		// check if deployment is existed in the cluster / namespace
		let workloads = await ClusterManager.getDeploysByFilter(namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${mainAppName}`,
		});
		// Fallback support for deprecated mainAppName
		if (!workloads || workloads.length === 0) {
			workloads = await ClusterManager.getDeploysByFilter(namespace, {
				context: cluster.contextName,
				filterLabel: `main-app=${deprecatedMainAppName}`,
			});
		}
		if (!workloads || workloads.length === 0)
			return respondFailure(`There are no deployments in "${namespace}" namespace of "${clusterSlug}" cluster.`);

		// delete in database
		let [updatedApp] = await this.service.update({ _id: app._id }, { [`deployEnvironment.${env}.envVars`]: [] });
		if (!updatedApp) return { status: 0, messages: [`Failed to delete environment variables in "${env}" deploy environment of "${slug}" app.`] };

		// Set environment variables to deployment in the cluster
		try {
			const deleteEnvVarsRes = await ClusterManager.deleteEnvVarByFilter(
				envVars.map((_var) => _var.name),
				namespace,
				{
					context: cluster.contextName,
					filterLabel: `main-app=${mainAppName}`,
				}
			);

			let result = { status: 1, data: updatedApp.deployEnvironment[env].envVars, messages: [deleteEnvVarsRes] };
			return result;
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	/**
	 * Update a variable on the deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/environment/domains")
	async addEnvironmentDomain(
		@Body()
		body: {
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
			/**
			 * New domains to be added into this deploy environment
			 * @example ["example.com", "www.example.com"]
			 */
			domains: string[];
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		const { DB } = await import("@/modules/api/DB");
		// validate
		let { env, domains } = body;
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };
		if (!domains) return { status: 0, messages: [`Array of domains is required.`] };

		// find app
		const app = await this.service.findOne(this.filter, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.deployEnvironment) return respondFailure(`App "${app.slug}" doesn't have any deploy environments.`);
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${app.slug}" doesn't have any deploy environment named "${env}".`] };

		const clusterSlug = app.deployEnvironment[env].cluster;
		const cluster = await DB.findOne("cluster", { slug: clusterSlug });
		if (!cluster) return respondFailure(`Cluster not found: "${clusterSlug}"`);

		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		// validate domain
		for (const domain of domains) {
			if (domain.indexOf(`http`) > -1) return respondFailure(`Invalid domain, no "http://" or "https://" needed`);
			if (domain.indexOf(`/`) > -1) return respondFailure(`Invalid domain, no special characters.`);
		}

		// check if added domains are existed
		let existedDomain;
		const currentDomains = app.deployEnvironment[env].domains || [];
		domains.forEach((domain) => {
			if (currentDomains.includes(domain)) existedDomain = domain;
		});
		if (existedDomain) return respondFailure(`Domain "${existedDomain}" is existed.`);

		// add new domains
		const updateData: AppDto = {};
		updateData[`deployEnvironment.${env}.domains`] = [...(app.deployEnvironment[env].domains || []), ...domains];

		let updatedApp = await this.service.updateOne({ slug: app.slug }, updateData);
		if (!updatedApp) return respondFailure("Failed to update new domains to " + app.slug + "app.");

		console.log("AppController > addEnvironmentDomain() > updatedApp.deployEnvironment[env] :>> ", updatedApp.deployEnvironment[env]);

		// generate deployment files and apply new config
		const { BUILD_TAG } = fetchDeploymentFromContent(updatedApp.deployEnvironment[env].deploymentYaml);
		console.log("AppController > addEnvironmentDomain() > BUILD_TAG :>> ", BUILD_TAG);
		console.log("AppController > addEnvironmentDomain() > this.user :>> ", this.user);

		let deployment: GenerateDeploymentResult = await generateDeployment({
			appSlug: app.slug,
			env,
			username: this.user.slug,
			workspace: this.workspace,
			buildTag: BUILD_TAG,
		});

		const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = deployment;

		// update data to deploy environment:
		let serverDeployEnvironment = await getDeployEvironmentByApp(updatedApp, env);
		serverDeployEnvironment.prereleaseUrl = prereleaseUrl;
		serverDeployEnvironment.deploymentYaml = deploymentContent;
		serverDeployEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;
		serverDeployEnvironment.updatedAt = new Date();
		serverDeployEnvironment.lastUpdatedBy = this.user.username;

		// Update {user}, {project}, {environment} to database before rolling out
		const updatedAppData = { deployEnvironment: updatedApp.deployEnvironment || {} } as IApp;
		updatedAppData.lastUpdatedBy = this.user.username;
		updatedAppData.deployEnvironment[env] = serverDeployEnvironment;

		updatedApp = await DB.updateOne("app", { slug: app.slug }, updatedAppData);
		if (!updatedApp) return respondFailure("Unable to apply new domain configuration for " + env + " environment of " + app.slug + "app.");

		let workloads = await ClusterManager.getDeploysByFilter(serverDeployEnvironment.namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${mainAppName}`,
		});

		// Fallback support for deprecated mainAppName
		let deprecatedWorkloads = await ClusterManager.getDeploysByFilter(serverDeployEnvironment.namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${deprecatedMainAppName}`,
		});
		if (deprecatedWorkloads?.length > 0) workloads.push(...deprecatedWorkloads);

		console.log("AppController > addEnvironmentDomain() > workloads :>> ", workloads);
		console.log("AppController > addEnvironmentDomain() > workloads.length :>> ", workloads?.length);

		if (workloads && workloads.length > 0) {
			// create new release and roll out
			const release = await createReleaseFromApp(updatedApp, env, BUILD_TAG, {
				author: this.user,
				cliVersion: currentVersion(),
				workspace: this.workspace,
			});

			// apply deployment YAML
			await ClusterManager.kubectlApplyContent(deployment.deploymentContent, { context: cluster.contextName });

			// const result = await ClusterManager.rollout(release._id.toString());
			// if (result.error) return respondFailure(`Failed to roll out the release :>> ${result.error}.`);
		}

		return respondSuccess({ data: updatedApp });
	}

	/**
	 * View app's container logs
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/environment/logs")
	async viewLogs(
		@Queries()
		queryParams?: {
			/**
			 * App's slug
			 */
			slug: string;
			/**
			 * App's deploy environment code (dev, prod,...)
			 * @default "dev"
			 */
			env?: string;
		}
	) {
		if (!this.filter.slug) return respondFailure(`App's slug is required.`);
		if (!this.filter.env) return respondFailure(`App's deploy environment code is required.`);

		const app = await this.service.findOne({ slug: this.filter.slug }, this.options);
		if (!app) return respondFailure("App not found.");

		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();

		const logs = await deployEnvSvc.viewDeployEnvironmentLogs(app, this.filter.env);
		if (!logs) return respondFailure({ data: "", msg: "No logs found." });

		return respondSuccess({ data: logs });
	}

	/**
	 * Take down a deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/deploy_environment/down")
	async takeDownDeployEnvironment(
		@Queries()
		queryParams?: {
			/**
			 * App's ID
			 */
			_id?: string;
			/**
			 * App slug
			 */
			slug?: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		}
	) {
		const { _id, slug, env } = this.filter;
		if (!_id && !slug) return respondFailure(`App "_id" or "slug" is required.`);

		const app = await this.service.findOne({ $or: [{ _id }, { slug }] }, this.options);
		if (!app) return respondFailure(`App not found.`);

		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();

		try {
			const result = await deployEnvSvc.takeDownDeployEnvironment(app, env);
			if (!result.success) return respondFailure(`Unable to take down this deploy environment: ${result.message}.`);
			return respondSuccess({ data: result });
		} catch (e) {
			return respondFailure(`Unable to take down this deploy environment: ${e}`);
		}
	}

	/**
	 * Sleep a deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/deploy_environment/sleep")
	async sleepDeployEnvironment(
		@Queries()
		queryParams?: {
			/**
			 * App's ID
			 */
			_id?: string;
			/**
			 * App slug
			 */
			slug?: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		}
	) {
		const { _id, slug, env } = this.filter;
		if (!_id && !slug) return respondFailure(`App "_id" or "slug" is required.`);

		const app = await this.service.findOne({ $or: [{ _id }, { slug }] }, this.options);
		if (!app) return respondFailure(`App not found.`);

		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();

		try {
			const result = await deployEnvSvc.sleepDeployEnvironment(app, env);
			if (!result.success) return respondFailure(`Unable to sleep a deploy environment: ${result.message}.`);
			return respondSuccess({ data: result });
		} catch (e) {
			return respondFailure(`Unable to sleep a deploy environment: ${e}`);
		}
	}

	/**
	 * Awake a sleeping deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/deploy_environment/awake")
	async awakeDeployEnvironment(
		@Queries()
		queryParams?: {
			/**
			 * App's ID
			 */
			_id?: string;
			/**
			 * App slug
			 */
			slug?: string;
			/**
			 * Deploy environment name
			 * @example "dev" | "prod"
			 */
			env: string;
		}
	) {
		const { _id, slug, env } = this.filter;
		if (!_id && !slug) return respondFailure(`App "_id" or "slug" is required.`);

		const app = await this.service.findOne({ $or: [{ _id }, { slug }] }, this.options);
		if (!app) return respondFailure(`App not found.`);

		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService();

		try {
			const result = await deployEnvSvc.wakeUpDeployEnvironment(app, env);
			if (!result.success) return respondFailure(`Unable to awake a deploy environment: ${result.message}.`);
			return respondSuccess({ data: result });
		} catch (e) {
			return respondFailure(`Unable to awake a deploy environment: ${e}`);
		}
	}
}
