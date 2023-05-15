import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "@tsoa/runtime";
import { isJSON } from "class-validator";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import { isArray, isBoolean, isEmpty, isString, isUndefined } from "lodash";

import type { AppGitInfo, IApp, ICluster, IContainerRegistry, IFramework, IProject } from "@/entities";
import { AppDto } from "@/entities";
import type { SslType } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPatchQueryParams, IPostQueryParams } from "@/interfaces";
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
import { createDiginextDomain } from "@/modules/diginext/dx-domain";
import { getRepoURLFromRepoSSH } from "@/modules/git";
import ClusterManager from "@/modules/k8s";
import { currentVersion, parseGitRepoDataFromRepoSSH } from "@/plugins";
import { MongoDB } from "@/plugins/mongodb";
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
	 * "1x" - { requests: { cpu: `50m`, memory: `256Mi` }, limits: { cpu: `50m`, memory: `256Mi` } }
	 * "2x" - { requests: { cpu: `100m`, memory: `512Mi` }, limits: { cpu: `100m`, memory: `512Mi` } }
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
	 * - `letenscrypt`
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
}

@Tags("App")
@Route("app")
export default class AppController extends BaseController<IApp, AppService> {
	constructor() {
		super(new AppService());
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: IGetQueryParams) {
		let apps = await DB.find<IApp>("app", this.filter, this.options, this.pagination);

		if (isEmpty(apps)) return respondSuccess({ data: [] });

		// TODO: remove this code after all "deployEnvironment.envVars" of apps are {Array}
		// convert "envVars" Object to Array (if needed)
		apps = apps.map((app) => {
			if (app.deployEnvironment)
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
		});

		return { status: 1, data: apps } as ResponseData;
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: AppInputSchema, @Queries() queryParams?: IPostQueryParams) {
		let project: IProject,
			appDto: IApp = { ...(body as any) };

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
	async update(@Body() body: AppDto, @Queries() queryParams?: IPatchQueryParams) {
		let project: IProject,
			projectSvc = new ProjectService();

		if (body.project) {
			project = await projectSvc.findOne({ _id: body.project });
			if (!project) return { status: 0, messages: [`Project "${body.project}" not found.`] } as ResponseData;
			body.projectSlug = project.slug;
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

		Object.entries(app.deployEnvironment).map(async ([env, deployEnvironment]) => {
			if (!isEmpty(deployEnvironment)) {
				const { cluster: clusterShortName, namespace } = deployEnvironment;
				const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
				let errorMsg;

				if (cluster) {
					const { contextName: context } = cluster;
					try {
						// switch to the cluster of this environment
						await ClusterManager.authCluster(clusterShortName);

						/**
						 * IMPORTANT
						 * ---
						 * Should NOT delete namespace because it will affect other apps in a project!
						 */

						// Delete INGRESS
						await ClusterManager.deleteIngressByFilter(namespace, { context, filterLabel: `main-app=${app.slug}` });
						// Delete SERVICE
						await ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `main-app=${app.slug}` });
						// Delete DEPLOYMENT
						await ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `main-app=${app.slug}` });
					} catch (e) {
						logError(`[BaseController] deleteEnvironment (${clusterShortName} - ${namespace}) :>>`, e);
						errorMsg = e.message;
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
	 * Create new deploy environment of the application.
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/environment")
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

		const project = app.project as IProject;
		const { slug: projectSlug } = project;

		// Assign default values to optional params:

		if (!deployEnvironmentData.size) deployEnvironmentData.size = "1x";
		if (!deployEnvironmentData.shouldInherit) deployEnvironmentData.shouldInherit = true;
		if (!deployEnvironmentData.replicas) deployEnvironmentData.replicas = 1;
		if (!deployEnvironmentData.redirect) deployEnvironmentData.redirect = true;

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
			const isNamespaceExisted = await ClusterManager.isNamespaceExisted(deployEnvironmentData.namespace, { context: cluster.contextName });
			if (isNamespaceExisted)
				return respondFailure({
					msg: `Namespace "${deployEnvironmentData.namespace}" was existed in "${deployEnvironmentData.cluster}" cluster, please choose different name or leave empty to use generated namespace name.`,
				});
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
			} = await createDiginextDomain({ name: subdomain, data: cluster.primaryIP });
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
		deployEnvironmentData.ingress = "nginx";

		// create deploy environment in the app:
		const [updatedApp] = await this.service.update(
			{ slug: appSlug },
			{
				[`deployEnvironment.${env}`]: deployEnvironmentData,
			}
		);
		// console.log("updatedApp :>> ", updatedApp);
		if (!updatedApp) return respondFailure({ msg: `Failed to create "${env}" deploy environment.` });

		const appConfig = await getAppConfigFromApp(updatedApp);

		return respondSuccess({ data: appConfig });
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
		const app = await this.service.findOne(appFilter);

		// check if the environment is existed
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

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
			try {
				// switch to the cluster of this environment
				await ClusterManager.authCluster(clusterShortName);

				/**
				 * IMPORTANT
				 * ---
				 * Should NOT delete namespace because it will affect other apps in a project!
				 */

				// Delete INGRESS
				await ClusterManager.deleteIngressByFilter(namespace, { context, filterLabel: `main-app=${app.slug}` });
				// Delete SERVICE
				await ClusterManager.deleteServiceByFilter(namespace, { context, filterLabel: `main-app=${app.slug}` });
				// Delete DEPLOYMENT
				await ClusterManager.deleteDeploymentsByFilter(namespace, { context, filterLabel: `main-app=${app.slug}` });
			} catch (e) {
				logError(`[BaseController] deleteEnvironment (${clusterShortName} - ${namespace}) :>>`, e);
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
		@Queries() queryParams?: IPostQueryParams
	) {
		console.log("createEnvVarsOnDeployEnvironment > body :>> ", body);
		// return { status: 0 };
		let { slug, env, envVars } = body;
		if (!slug) return { status: 0, messages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };
		if (!envVars) return { status: 0, messages: [`Array of environment variables (envVars) is required.`] };
		// if (!isJSON(envVars)) return { status: 0, messages: [`Array of variables (envVars) is not a valid JSON.`] };

		const app = await this.service.findOne({ ...this.filter, slug });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });

		const newEnvVars = isJSON(envVars)
			? (JSON.parse(envVars) as KubeEnvironmentVariable[])
			: isArray(envVars)
			? (envVars as unknown as KubeEnvironmentVariable[])
			: [];

		// console.log("updateEnvVars :>> ", updateEnvVars);
		const [updatedApp] = await this.service.update(
			{ slug },
			{
				[`deployEnvironment.${env}.envVars`]: newEnvVars,
			}
		);
		if (!updatedApp) return { status: 0, messages: [`Failed to create "${env}" deploy environment.`] };

		// Set environment variables to deployment in the cluster
		const deployEnvironment = updatedApp.deployEnvironment[env];
		const { namespace, cluster: clusterShortName } = deployEnvironment;
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		if (!cluster) return respondFailure({ msg: `Cluster "${clusterShortName}" not found.` });

		// if the workload has been deployed before -> update the environment variables
		const workload = await ClusterManager.getDeployByFilter(namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${slug}`,
		});

		if (workload) {
			const setEnvVarsRes = await ClusterManager.setEnvVarByFilter(newEnvVars, namespace, {
				context: cluster.contextName,
				filterLabel: `main-app=${slug}`,
			});
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
		@Queries() queryParams?: IPostQueryParams
	) {
		let { slug, env, envVar } = body;
		if (!slug) return { status: 0, messages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };
		if (!envVar) return { status: 0, messages: [`A variable (envVar { name, value }) is required.`] };
		// if (!isJSON(envVar)) return { status: 0, messages: [`A variable (envVar { name, value }) should be a valid JSON format.`] };

		const app = await this.service.findOne({ ...this.filter, slug });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${slug}" doesn't have any deploy environment named "${env}".`] };

		envVar = isJSON(envVar) ? (JSON.parse(envVar as unknown as string) as KubeEnvironmentVariable) : isArray(envVar) ? envVar : undefined;
		if (!envVar) return respondFailure(`ENV VAR is invalid.`);

		const envVars = app.deployEnvironment[env].envVars || [];
		const varToBeUpdated = envVars.find((v) => v.name === envVar.name);

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
		const deployEnvironment = updatedApp.deployEnvironment[env];
		const { namespace, cluster: clusterShortName } = deployEnvironment;
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		const setEnvVarsRes = await ClusterManager.setEnvVarByFilter(envVars, namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${slug}`,
		});

		let result = { status: 1, data: updatedApp.deployEnvironment[env].envVars, messages: [setEnvVarsRes] };
		return result;
	}

	/**
	 * Update a variable on the deploy environment of the application.
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

		const app = await this.service.findOne({ ...this.filter, slug });
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${slug}" doesn't have any deploy environment named "${env}".`] };
		if (isEmpty(app.deployEnvironment[env]))
			return { status: 0, messages: [`This deploy environment (${env}) of "${slug}" app doesn't have any environment variables.`] };

		const envVars = app.deployEnvironment[env].envVars;

		// delete in database
		let [updatedApp] = await this.service.update({ _id: app._id }, { [`deployEnvironment.${env}.envVars`]: [] });
		if (!updatedApp) return { status: 0, messages: [`Failed to delete environment variables in "${env}" deploy environment of "${slug}" app.`] };

		// Set environment variables to deployment in the cluster
		const deployEnvironment = updatedApp.deployEnvironment[env];
		const { namespace, cluster: clusterShortName } = deployEnvironment;
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		const deleteEnvVarsRes = await ClusterManager.deleteEnvVarByFilter(
			envVars.map((_var) => _var.name),
			namespace,
			{
				context: cluster.contextName,
				filterLabel: `main-app=${slug}`,
			}
		);

		let result = { status: 1, data: updatedApp.deployEnvironment[env].envVars, messages: [deleteEnvVarsRes] };
		return result;
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
		// validate
		let { env, domains } = body;
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };
		if (!domains) return { status: 0, messages: [`Array of domains is required.`] };

		// find app
		const app = await this.service.findOne(this.filter);
		if (!app) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `App not found.` });
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${app.slug}" doesn't have any deploy environment named "${env}".`] };

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

		// create new release and roll out
		const release = await createReleaseFromApp(updatedApp, env, { author: this.user, cliVersion: currentVersion(), workspace: this.workspace });
		const result = await ClusterManager.rollout(release._id.toString());

		if (result.error) throw new Error(`Failed to roll out the release :>> ${result.error}.`);

		return respondSuccess({ data: updatedApp });
	}
}
