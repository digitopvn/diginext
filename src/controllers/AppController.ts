import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "@tsoa/runtime";
import { isJSON } from "class-validator";
import { log, logError, logWarn } from "diginext-utils/dist/xconsole/log";
import { isArray, isBoolean, isEmpty, isNumber, isString, isUndefined } from "lodash";

import type { AppGitInfo, IApp, IBuild, ICluster, IContainerRegistry, IFramework, IProject, IRelease } from "@/entities";
import * as entities from "@/entities";
import type { SslType } from "@/interfaces";
import * as interfaces from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import type { ResourceQuotaSize } from "@/interfaces/SystemTypes";
import { sslIssuerList } from "@/interfaces/SystemTypes";
import { migrateAppEnvironmentVariables } from "@/migration/migrate-app-environment";
import { DB } from "@/modules/api/DB";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import { getDeployEvironmentByApp } from "@/modules/apps/get-app-environment";
import { createReleaseFromApp } from "@/modules/build/create-release-from-app";
import type { GenerateDeploymentResult } from "@/modules/deploy";
import { fetchDeploymentFromContent, generateDeployment } from "@/modules/deploy";
import getDeploymentName from "@/modules/deploy/generate-deployment-name";
import { createDxDomain } from "@/modules/diginext/dx-domain";
import { getRepoURLFromRepoSSH } from "@/modules/git";
import ClusterManager from "@/modules/k8s";
import { checkQuota } from "@/modules/workspace/check-quota";
import { currentVersion, parseGitRepoDataFromRepoSSH } from "@/plugins";
import { MongoDB } from "@/plugins/mongodb";
import { makeSlug } from "@/plugins/slug";
import { ProjectService } from "@/services";
import AppService from "@/services/AppService";

import BaseController from "./BaseController";

export interface CreateEnvVarsDto {
	/**
	 * App slug
	 */
	slug: string;
	/**
	 * Deploy environment name
	 * @example "dev" | "prod"
	 */
	env: string;
	/**
	 * Array of variables to be created on deploy environment in JSON format
	 */
	envVars: string;
}

export interface AppInputSchema {
	/**
	 * `REQUIRES`
	 * ---
	 * App's name
	 */
	name: string;

	/**
	 * `REQUIRES`
	 * ---
	 * Project's ID or slug
	 */
	project: string;

	/**
	 * `REQUIRES`
	 * ---
	 * A SSH URI of the source code repository or a detail information of this repository
	 * @example git@bitbucket.org:digitopvn/example-repo.git
	 */
	git: string | AppGitInfo;

	/**
	 * OPTIONAL
	 * ---
	 * Framework's ID or slug or {Framework} instance
	 */
	framework?: string | IFramework;
}

export interface DeployEnvironmentData {
	/**
	 * `REQUIRES`
	 * ---
	 * Container registry's slug
	 * @requires
	 */
	registry: string;

	/**
	 * `REQUIRES`
	 * ---
	 * Cluster's short name
	 * @requires
	 */
	cluster: string;

	/**
	 * `REQUIRES`
	 * ---
	 * Container's port
	 * @requires
	 */
	port: number;

	/**
	 * `REQUIRES`
	 * ---
	 * Image URI of this app on the Container Registry (without `TAG`).
	 * - Combined from: `<registry-image-base-url>/<project-slug>/<app-name-slug>`
	 * - **Don't** specify `tag` at the end! (eg. `latest`, `beta`,...)
	 * @default <registry-image-base-url>/<project-slug>/<app-name-slug>
	 * @example "asia.gcr.io/my-workspace/my-project/my-app"
	 */
	imageURL: string;

	/**
	 * Build number is image's tag (no special characters, eg. "dot" or "comma")
	 * @example latest, v01, prerelease, alpha, beta,...
	 */
	buildNumber: string;

	/**
	 * OPTIONAL
	 * ---
	 * Container's scaling replicas
	 * @default 1
	 */
	replicas?: number;

	/**
	 * OPTIONAL
	 * ---
	 * Destination namespace name, will be generated automatically by `<project-slug>-<env>` if not specified.
	 */
	namespace?: string;

	/**
	 * OPTIONAL
	 * ---
	 * Container quota resources
	 * @default 1x
	 * @example
	 * "none" - {}
	 * "1x" - { requests: { cpu: "20m", memory: "128Mi" }, limits: { cpu: "20m", memory: 128Mi" } }
	 * "2x" - { requests: { cpu: "40m", memory: "256Mi" }, limits: { cpu: "40m", memory: "256Mi" } }
	 * "3x" - { requests: { cpu: "80m", memory: "512Mi" }, limits: { cpu: "80m", memory: "512Mi" } }
	 * "4x" - { requests: { cpu: "160m", memory: "1024Mi" }, limits: { cpu: "160m", memory: "1024Mi" } }
	 * "5x" - { requests: { cpu: "320m", memory: "2048Mi" }, limits: { cpu: "320m", memory: "2048Mi" } }
	 * "6x" - { requests: { cpu: "640m", memory: "4058Mi" }, limits: { cpu: "640m", memory: "4058Mi" } }
	 * "7x" - { requests: { cpu: "1280m", memory: "2048Mi" }, limits: { cpu: "1280m", memory: "2048Mi" } }
	 * "8x" - { requests: { cpu: "2560m", memory: "8116Mi" }, limits: { cpu: "2560m", memory: "8116Mi" } }
	 * "9x" - { requests: { cpu: "5120m", memory: "16232Mi" }, limits: { cpu: "5120m", memory: "16232Mi" } }
	 * "10x" - { requests: { cpu: "10024m", memory: "32464Mi" }, limits: { cpu: "10024m", memory: "32464Mi" } }
	 */
	size?: ResourceQuotaSize;

	/**
	 * OPTIONAL
	 * ---
	 * Set to `false` if you DON'T want to inherit the Ingress YAML config from the previous deployment
	 * @default true
	 */
	shouldInherit?: boolean;

	/**
	 * OPTIONAL
	 * ---
	 * Set to `false` if you don't want to redirect all the secondary domains to the primary domain.
	 * @default true
	 */
	redirect?: boolean;

	/**
	 * OPTIONAL
	 * ---
	 * Set `true` if you want to use a generated domain for this deploy environment.
	 * @default false
	 */
	useGeneratedDomain?: boolean;

	/**
	 * OPTIONAL
	 * ---
	 * List of application's domains.
	 * @default []
	 */
	domains?: string[];

	/**
	 * OPTIONAL
	 * ---
	 * Flag to enable CDN for this application
	 * @default false
	 */
	cdn?: boolean;

	/**
	 * OPTIONAL
	 * ---
	 * Select your SSL Certificate Issuer, one of:
	 * - `letsencrypt`
	 * - `custom`
	 * - `none`
	 * @default letsencrypt
	 */
	ssl?: SslType;

	/**
	 * OPTIONAL
	 * ---
	 * Secret name to hold the key of SSL, will be automatically generated with the primary domain.
	 * Only need to specify when using "custom" SSL (which is the SSL from third-party issuer)
	 */
	tlsSecret?: string;

	/**
	 * OPTIONAL
	 * ---
	 * Kubernetes Ingress Class
	 * @default nginx
	 * @example "nginx" | "kong"
	 */
	ingress?: string;

	/**
	 * OPTIONAL
	 * ---
	 * Username of the person who update the app
	 */
	lastUpdatedBy?: string;
}

@Tags("App")
@Route("app")
export default class AppController extends BaseController<IApp, AppService> {
	service: AppService;

	constructor() {
		super(new AppService());
	}

	/**
	 * List of apps
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: interfaces.IGetQueryParams) {
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

		return { status: 1, data: apps } as ResponseData;
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: AppInputSchema, @Queries() queryParams?: interfaces.IPostQueryParams) {
		let project: IProject,
			appDto: IApp = { ...(body as any) };

		// check dx quota
		const quotaRes = await checkQuota(this.workspace);
		if (!quotaRes.status) return respondFailure(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed)
			return respondFailure(`You've exceeded the limit amount of apps (${quotaRes.data.type} / Max. ${quotaRes.data.limits.apps} apps).`);

		// validate
		if (!body.project) return respondFailure({ msg: `Project ID or slug or instance is required.` });
		if (!body.name) return respondFailure({ msg: `App's name is required.` });
		if (!body.git) return respondFailure("App's git info is required.");

		// find parent project of this app
		if (MongoDB.isValidObjectId(body.project)) {
			project = await DB.findOne<IProject>("project", { _id: body.project });
		} else if (isString(body.project)) {
			project = await DB.findOne<IProject>("project", { slug: body.project });
		} else {
			return respondFailure({ msg: `"project" is not a valid ID or slug.` });
		}

		if (!project) return { status: 0, messages: [`Project "${body.project}" not found.`] } as ResponseData;
		appDto.projectSlug = project.slug;

		// framework
		if (!body.framework) body.framework = { name: "none", slug: "none", repoURL: "unknown", repoSSH: "unknown" } as IFramework;
		if (body.framework === "none") body.framework = { name: "none", slug: "none", repoURL: "unknown", repoSSH: "unknown" } as IFramework;
		appDto.framework = body.framework as IFramework;

		// git
		if (isString(body.git)) {
			const gitData = parseGitRepoDataFromRepoSSH(body.git);
			if (!gitData) return respondFailure({ msg: `Git repository information is not valid.` });

			body.git = {
				repoSSH: body.git as string,
				repoURL: getRepoURLFromRepoSSH(gitData.gitProvider, gitData.fullSlug),
				provider: gitData.gitProvider,
			};
		}
		appDto.git = body.git;

		let newApp: IApp;

		try {
			newApp = await this.service.create(appDto);
			if (!newApp) return { status: 0, messages: [`Failed to update app at "${JSON.stringify(this.filter)}"`] } as ResponseData;
		} catch (e) {
			return { status: 0, messages: [e.message] } as ResponseData;
		}

		const newAppId = newApp._id;

		// migrate app environment variables if needed (convert {Object} to {Array})
		const migratedApp = await migrateAppEnvironmentVariables(newApp);
		if (migratedApp) newApp = migratedApp;

		// add this new app to the project info
		if (project) {
			const projectApps = [...(project.apps || []), newAppId];
			[project] = await DB.update<IProject>("project", { _id: project._id }, { apps: projectApps });
		}

		return { status: 1, data: newApp, messages: [""] } as ResponseData;
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: entities.AppDto, @Queries() queryParams?: interfaces.IPatchQueryParams) {
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
	async delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		const app = await this.service.findOne(this.filter, { populate: ["project"] });

		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		if (app.deployEnvironment)
			Object.entries(app.deployEnvironment).map(async ([env, deployEnvironment]) => {
				if (!isEmpty(deployEnvironment)) {
					const { cluster: clusterShortName, namespace } = deployEnvironment;
					const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
					let errorMsg;

					if (cluster) {
						const { contextName: context } = cluster;

						// switch to the cluster of this environment
						await ClusterManager.authCluster(clusterShortName);

						try {
							/**
							 * IMPORTANT
							 * ---
							 * Should NOT delete namespace because it will affect other apps in a project!
							 */

							// Delete INGRESS
							await ClusterManager.deleteIngressByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });
							// Delete SERVICE
							await ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });
							// Delete DEPLOYMENT
							await ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });
						} catch (e) {
							logError(`[BaseController] deleteEnvironment (${clusterShortName} - ${namespace}) :>>`, e);
							errorMsg = e.message;
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
						} catch (e) {
							logError(`[BaseController] deleteEnvironment (${clusterShortName} - ${namespace}) :>>`, e);
							errorMsg += e.message;
						}
					}
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
		return this.createDeployEnvironment({ appSlug: slug, env, deployEnvironmentData: body });
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
		@Queries() queryParams?: interfaces.IPostQueryParams
	) {
		// conversion if needed...
		if (isJSON(body.deployEnvironmentData))
			body.deployEnvironmentData = JSON.parse(body.deployEnvironmentData as unknown as string) as DeployEnvironmentData;

		//
		const { appSlug, env, deployEnvironmentData } = body;
		if (!appSlug) return respondFailure({ msg: `App slug is required.` });
		if (!env) return respondFailure({ msg: `Deploy environment name is required.` });
		if (!deployEnvironmentData) return respondFailure({ msg: `Deploy environment configuration is required.` });

		// get app data:
		const app = await DB.findOne<IApp>("app", { slug: appSlug }, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.project) return respondFailure({ msg: `This app is orphan, apps should belong to a project.` });
		if (!deployEnvironmentData.imageURL) respondFailure({ msg: `Build image URL is required.` });
		if (!deployEnvironmentData.buildNumber) respondFailure({ msg: `Build number (image's tag) is required.` });

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
		const quotaRes = await checkQuota(this.workspace, { resourceSize: deployEnvironmentData.size });
		if (!quotaRes.status) return respondFailure(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed)
			return respondFailure(
				`You've exceeded the limit amount of container size (${quotaRes.data.type} / Max size: ${quotaRes.data.limits.size}x).`
			);

		// Validate deploy environment data:

		// cluster
		if (!deployEnvironmentData.cluster) return respondFailure({ msg: `Param "cluster" (Cluster's short name) is required.` });
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: deployEnvironmentData.cluster });
		if (!cluster) return respondFailure({ msg: `Cluster "${deployEnvironmentData.cluster}" is not valid` });

		// namespace
		if (!deployEnvironmentData.namespace) {
			deployEnvironmentData.namespace = `${projectSlug}-${env}`;
		} else {
			// Check if namespace is existed...
			// const isNamespaceExisted = await ClusterManager.isNamespaceExisted(deployEnvironmentData.namespace, { context: cluster.contextName });
			// if (isNamespaceExisted)
			// 	return respondFailure({
			// 		msg: `Namespace "${deployEnvironmentData.namespace}" was existed in "${deployEnvironmentData.cluster}" cluster, please choose different name or leave empty to use generated namespace name.`,
			// 	});
		}

		// container registry
		if (!deployEnvironmentData.registry) return respondFailure({ msg: `Param "registry" (Container Registry's slug) is required.` });
		const registry = await DB.findOne<IContainerRegistry>("registry", { slug: deployEnvironmentData.registry });
		if (!registry) return respondFailure({ msg: `Container Registry "${deployEnvironmentData.registry}" is not existed.` });

		// Domains & SSL certificate...
		if (!deployEnvironmentData.domains) deployEnvironmentData.domains = [];
		if (deployEnvironmentData.useGeneratedDomain) {
			const subdomain = `${projectSlug}-${appSlug}.${env}`;
			const {
				status,
				messages,
				data: { domain },
			} = await createDxDomain({ name: subdomain, data: cluster.primaryIP }, this.workspace.dx_key);
			if (!status) logWarn(`[APP_CONTROLLER] ${messages.join(". ")}`);
			deployEnvironmentData.domains = status ? [domain, ...deployEnvironmentData.domains] : deployEnvironmentData.domains;
		}

		if (!deployEnvironmentData.ssl) {
			deployEnvironmentData.ssl = deployEnvironmentData.domains.length > 0 ? "letsencrypt" : "none";
		}
		if (!sslIssuerList.includes(deployEnvironmentData.ssl))
			return respondFailure({ msg: `Param "ssl" issuer is invalid, should be one of: "letsencrypt", "custom" or "none".` });

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
		if (isUndefined(deployEnvironmentData.port)) return respondFailure({ msg: `Param "port" is required.` });
		if (isUndefined(deployEnvironmentData.cdn) || !isBoolean(deployEnvironmentData.cdn)) deployEnvironmentData.cdn = false;
		// deployEnvironmentData.ingress = "nginx";

		// create deploy environment in the app:
		let [updatedApp] = await this.service.update(
			{ slug: appSlug },
			{
				[`deployEnvironment.${env}`]: deployEnvironmentData,
			}
		);
		// console.log("updatedApp :>> ", updatedApp);
		if (!updatedApp) return respondFailure({ msg: `Failed to create "${env}" deploy environment.` });

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
			username: this.user.slug,
			workspace: this.workspace,
			buildNumber,
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

		updatedApp = await DB.updateOne<IApp>("app", { slug: app.slug }, updatedAppData);
		if (!updatedApp) return respondFailure("Unable to apply new domain configuration for " + env + " environment of " + app.slug + "app.");

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
				author: this.user,
				cliVersion: currentVersion(),
				workspace: this.workspace,
			});

			const result = await ClusterManager.rollout(release._id.toString());
			if (result.error) return respondFailure(`Failed to roll out the release :>> ${result.error}.`);
		}

		return respondSuccess({ data: appConfig });
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
		@Queries() queryParams?: interfaces.IPostQueryParams
	) {
		//
		const { appSlug, env, deployEnvironmentData } = body;
		if (!appSlug) return respondFailure({ msg: `App slug is required.` });
		if (!env) return respondFailure({ msg: `Deploy environment name is required.` });
		if (!deployEnvironmentData) return respondFailure({ msg: `Deploy environment configuration is required.` });

		// get app data:
		const app = await DB.findOne<IApp>("app", { slug: appSlug }, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.project) return respondFailure({ msg: `This app is orphan, apps should belong to a project.` });
		if (!deployEnvironmentData.imageURL) respondFailure({ msg: `Build image URL is required.` });

		// build number
		if (!deployEnvironmentData.buildNumber) deployEnvironmentData.buildNumber = app.deployEnvironment[env].buildNumber;

		if (!deployEnvironmentData.buildNumber) {
			const releaseFilter = { appSlug: app.slug, buildStatus: "success", env, active: true };
			console.log("updateDeployEnvironment() > releaseFilter :>> ", releaseFilter);

			let latestRelease = await DB.findOne<IRelease>("release", releaseFilter, { populate: ["build"], order: { createdAt: -1 } });
			// "sometime" there are no "active" release, so just get the "success" release instead :)
			if (!latestRelease) {
				delete releaseFilter.active;
				latestRelease = await DB.findOne<IRelease>("release", releaseFilter, { populate: ["build"], order: { createdAt: -1 } });
			}
			if (!latestRelease) return respondFailure(`updateDeployEnvironment() > Release not found (app: "${app.slug}" - env: "${env}")`);

			const latestBuild = latestRelease.build as IBuild;
			if (!latestRelease) return respondFailure(`updateDeployEnvironment() > Latest build not found (app: "${app.slug}" - env: "${env}")`);
			deployEnvironmentData.buildNumber = latestBuild.tag;
		}

		if (!deployEnvironmentData.buildNumber) return respondFailure({ msg: `Build number (image's tag) is required.` });

		// finish checking build number
		const { buildNumber } = deployEnvironmentData;

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
		if (deployEnvironmentData.cluster) {
			cluster = await DB.findOne<ICluster>("cluster", { shortName: deployEnvironmentData.cluster });
		}

		// namespace
		if (deployEnvironmentData.namespace) {
			// Check if namespace is existed...
			const isNamespaceExisted = await ClusterManager.isNamespaceExisted(deployEnvironmentData.namespace, { context: cluster.contextName });
			if (isNamespaceExisted)
				return respondFailure({
					msg: `Namespace "${deployEnvironmentData.namespace}" was existed in "${deployEnvironmentData.cluster}" cluster, please choose different name or leave empty to use generated namespace name.`,
				});
		}

		// container registry
		if (deployEnvironmentData.registry) {
			const registry = await DB.findOne<IContainerRegistry>("registry", { slug: deployEnvironmentData.registry });
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
			} = await createDxDomain({ name: subdomain, data: cluster.primaryIP }, this.workspace.dx_key);
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

		// if (updatedApp.deployEnvironment[env].deploymentYaml) {
		// 	const { BUILD_NUMBER: buildNumber } = fetchDeploymentFromContent(updatedApp.deployEnvironment[env].deploymentYaml);
		// 	console.log("buildNumber :>> ", buildNumber);
		// 	console.log("this.user :>> ", this.user);
		// }

		// generate deployment files and apply new config
		let deployment: GenerateDeploymentResult = await generateDeployment({
			appSlug: app.slug,
			env,
			username: this.user.slug,
			workspace: this.workspace,
			buildNumber,
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

		updatedApp = await DB.updateOne<IApp>("app", { slug: app.slug }, updatedAppData);
		if (!updatedApp) return respondFailure("Unable to apply new domain configuration for " + env + " environment of " + app.slug + "app.");

		// create new release and roll out
		const release = await createReleaseFromApp(updatedApp, env, buildNumber, {
			author: this.user,
			cliVersion: currentVersion(),
			workspace: this.workspace,
		});
		const result = await ClusterManager.rollout(release._id.toString());

		if (result.error) return respondFailure(`Failed to roll out the release :>> ${result.error}.`);

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
		if (!id && !slug) {
			result.status = 0;
			result.messages.push(`App "id" or "slug" is required.`);
			return result;
		}
		if (!env) {
			result.status = 0;
			result.messages.push(`App "env" is required.`);
			return result;
		}

		// find the app
		const appFilter = typeof id != "undefined" ? { _id: id } : { slug };
		const app = await this.service.findOne(appFilter, { populate: ["project"] });

		// check if the environment is existed
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		const deployEnvironment = (app.deployEnvironment || {})[env.toString()];
		if (!deployEnvironment) {
			result.status = 0;
			result.messages.push(`App environment "${env}" not found.`);
			return result;
		}

		// take down the deploy environment
		const envConfig = await getDeployEvironmentByApp(app, env.toString());
		const { cluster: clusterShortName, namespace } = envConfig;
		if (!clusterShortName) logWarn(`[BaseController] deleteEnvironment`, { appFilter }, ` :>> Cluster "${clusterShortName}" not found.`);
		if (!namespace) logWarn(`[BaseController] deleteEnvironment`, { appFilter }, ` :>> Namespace "${namespace}" not found.`);

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		let errorMsg;

		if (cluster) {
			const { contextName: context } = cluster;

			// switch to the cluster of this environment
			await ClusterManager.authCluster(clusterShortName);

			try {
				/**
				 * IMPORTANT
				 * ---
				 * Should NOT delete namespace because it will affect other apps in a project!
				 */

				// Delete INGRESS
				await ClusterManager.deleteIngressByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });
				// Delete SERVICE
				await ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });
				// Delete DEPLOYMENT
				await ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `main-app=${mainAppName}` });
			} catch (e) {
				logError(`[BaseController] deleteEnvironment (${clusterShortName} - ${namespace}) - "main-app=${mainAppName}" :>>`, e);
				errorMsg = e.message;
			}

			/**
			 * FALLBACK SUPPORT FOR DEPRECATED MAIN APP NAME
			 */
			try {
				// Delete INGRESS
				await ClusterManager.deleteIngressByFilter(namespace, { context, filterLabel: `main-app=${deprecatedMainAppName}` });
				// Delete SERVICE
				await ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `main-app=${deprecatedMainAppName}` });
				// Delete DEPLOYMENT
				await ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `main-app=${deprecatedMainAppName}` });
			} catch (e) {
				logError(`[BaseController] deleteEnvironment (${clusterShortName} - ${namespace} - "main-app=${deprecatedMainAppName}") :>>`, e);
				errorMsg = e.message;
			}
		}

		// update the app (delete the deploy environment)
		const updatedApp = await this.service.update(appFilter, {
			[`deployEnvironment.${env}`]: {},
		});

		log(`[BaseController] deleted Environment`, { appFilter }, ` :>>`, { updatedApp });

		// respond the results
		result.data = updatedApp;
		return result;
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
		@Queries() queryParams?: interfaces.IPostQueryParams
	) {
		console.log("createEnvVarsOnDeployEnvironment > body :>> ", body);
		// return { status: 0 };
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

		const { namespace, cluster: clusterShortName } = deployEnvironment;
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		if (!cluster) return respondFailure(`Cluster not found: "${clusterShortName}"`);

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
			const { BUILD_NUMBER: buildNumber } = fetchDeploymentFromContent(updatedApp.deployEnvironment[env].deploymentYaml);

			let deployment: GenerateDeploymentResult = await generateDeployment({
				appSlug: app.slug,
				env,
				username: this.user.slug,
				workspace: this.workspace,
				buildNumber,
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

			updatedApp = await DB.updateOne<IApp>("app", { slug: app.slug }, updatedAppData);
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
	 * Update a variable on the deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/environment/variables")
	async updateSingleEnvVarOnDeployEnvironment(
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
			/**
			 * A variables to be created on deploy environment
			 */
			envVar: KubeEnvironmentVariable;
		},
		@Queries() queryParams?: interfaces.IPostQueryParams
	) {
		let { slug, env, envVar } = body;
		if (!slug) return { status: 0, messages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };
		if (!envVar) return { status: 0, messages: [`A variable (envVar { name, value }) is required.`] };
		// if (!isJSON(envVar)) return { status: 0, messages: [`A variable (envVar { name, value }) should be a valid JSON format.`] };

		const app = await this.service.findOne({ ...this.filter, slug }, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${slug}" doesn't have any deploy environment named "${env}".`] };

		const mainAppName = await getDeploymentName(app);
		const deprecatedMainAppName = makeSlug(app?.name).toLowerCase();

		envVar = isJSON(envVar) ? (JSON.parse(envVar as unknown as string) as KubeEnvironmentVariable) : isArray(envVar) ? envVar : undefined;
		if (!envVar) return respondFailure(`ENV VAR is invalid.`);

		const envVars = app.deployEnvironment[env].envVars || [];
		const varToBeUpdated = envVars.find((v) => v.name === envVar.name);

		const deployEnvironment = app.deployEnvironment[env];
		if (!deployEnvironment) return respondFailure(`Deploy environment "${env}" is not existed in "${slug}" app.`);
		if (!deployEnvironment.namespace) return respondFailure(`Namespace not existed in deploy environment "${env}" of "${slug}" app.`);
		if (!deployEnvironment.cluster) return respondFailure(`Cluster not existed in deploy environment "${env}" of "${slug}" app.`);

		const { namespace, cluster: clusterShortName } = deployEnvironment;
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		if (!cluster) return respondFailure(`Cluster not found: "${clusterShortName}"`);

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
			return respondFailure(`There are no deployments in "${namespace}" namespace of "${clusterShortName}" cluster `);

		// --- validation success ---

		let updatedApp: IApp;

		if (varToBeUpdated) {
			// update old variable
			const updatedEnvVars = envVars.map((v) => (v.name === envVar.name ? envVar : v));

			[updatedApp] = await this.service.update(
				{ slug },
				{
					[`deployEnvironment.${env}.envVars`]: updatedEnvVars,
				}
			);
			if (!updatedApp)
				return { status: 0, messages: [`Failed to update "${varToBeUpdated.name}" to variables of "${env}" deploy environment.`] };
		} else {
			// create new variable
			envVars.push(envVar);

			[updatedApp] = await this.service.update(
				{ slug },
				{
					[`deployEnvironment.${env}.envVars`]: envVars,
				}
			);
			if (!updatedApp) return { status: 0, messages: [`Failed to add "${varToBeUpdated.name}" to variables of "${env}" deploy environment.`] };
		}

		// Set environment variables to deployment in the cluster
		try {
			const setEnvVarsRes = await ClusterManager.setEnvVarByFilter(envVars, namespace, {
				context: cluster.contextName,
				filterLabel: `main-app=${mainAppName}`,
			});

			let result = { status: 1, data: updatedApp.deployEnvironment[env].envVars, messages: [setEnvVarsRes] };
			return result;
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
		@Queries() queryParams?: interfaces.IPostQueryParams
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

		const { namespace, cluster: clusterShortName } = deployEnvironment;

		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		if (!cluster) return respondFailure(`Cluster not found: "${clusterShortName}"`);

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
			return respondFailure(`There are no deployments in "${namespace}" namespace of "${clusterShortName}" cluster.`);

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
		@Queries() queryParams?: interfaces.IPostQueryParams
	) {
		// validate
		let { env, domains } = body;
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };
		if (!domains) return { status: 0, messages: [`Array of domains is required.`] };

		// find app
		const app = await this.service.findOne(this.filter, { populate: ["project"] });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.deployEnvironment) return respondFailure(`App "${app.slug}" doesn't have any deploy environments.`);
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${app.slug}" doesn't have any deploy environment named "${env}".`] };

		const clusterShortName = app.deployEnvironment[env].cluster;
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		if (!cluster) return respondFailure(`Cluster not found: "${clusterShortName}"`);

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
		const updateData: entities.AppDto = {};
		updateData[`deployEnvironment.${env}.domains`] = [...(app.deployEnvironment[env].domains || []), ...domains];

		let updatedApp = await this.service.updateOne({ slug: app.slug }, updateData);
		if (!updatedApp) return respondFailure("Failed to update new domains to " + app.slug + "app.");

		console.log("updatedApp.deployEnvironment[env] :>> ", updatedApp.deployEnvironment[env]);

		// generate deployment files and apply new config
		const { BUILD_NUMBER: buildNumber } = fetchDeploymentFromContent(updatedApp.deployEnvironment[env].deploymentYaml);
		console.log("buildNumber :>> ", buildNumber);
		console.log("this.user :>> ", this.user);

		let deployment: GenerateDeploymentResult = await generateDeployment({
			appSlug: app.slug,
			env,
			username: this.user.slug,
			workspace: this.workspace,
			buildNumber,
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

		updatedApp = await DB.updateOne<IApp>("app", { slug: app.slug }, updatedAppData);
		if (!updatedApp) return respondFailure("Unable to apply new domain configuration for " + env + " environment of " + app.slug + "app.");

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
				author: this.user,
				cliVersion: currentVersion(),
				workspace: this.workspace,
			});
			const result = await ClusterManager.rollout(release._id.toString());
			if (result.error) return respondFailure(`Failed to roll out the release :>> ${result.error}.`);
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

		const logs = await this.service.viewDeployEnvironmentLogs(app, this.filter.env);
		if (!logs) return respondFailure({ data: "", msg: "No logs found." });

		return respondSuccess({ data: logs });
	}
}
