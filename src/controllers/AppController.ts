import { isJSON } from "class-validator";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import { isArray, isEmpty } from "lodash";
import { ObjectId } from "mongodb";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { App, Cluster, Project } from "@/entities";
import type { ClientDeployEnvironmentConfig, HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { ResponseData } from "@/interfaces/ResponseData";
import { migrateAppEnvironmentVariables } from "@/migration/migrate-app-environment";
import { DB } from "@/modules/api/DB";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import { getDeployEvironmentByApp } from "@/modules/apps/get-app-environment";
import ClusterManager from "@/modules/k8s";
import { ProjectService } from "@/services";
import AppService from "@/services/AppService";

import BaseController from "./BaseController";

@Tags("App")
@Route("app")
export default class AppController extends BaseController<App> {
	constructor() {
		super(new AppService());
	}

	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: IGetQueryParams) {
		let apps = await DB.find<App>("app", this.filter, this.options, this.pagination);

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
		// console.log("[2] apps :>> ", apps);

		return { status: 1, data: apps } as ResponseData;
	}

	@Security("jwt")
	@Post("/")
	async create(@Body() body: any, @Queries() queryParams?: IPostQueryParams) {
		let project: Project,
			projectSvc: ProjectService = new ProjectService();

		if (body.project) {
			project = await projectSvc.findOne({ _id: new ObjectId(body.project) });
			if (!project) return { status: 0, messages: [`Project "${body.project}" not found.`] } as ResponseData;
			body.projectSlug = project.slug;
		}

		// body.deployEnvironment = convertBodyDeployEnvironmentObject(body);
		// console.log("AppController > body.deployEnvironment :>> ", JSON.stringify(body.deployEnvironment, null, 2));

		let newApp: App;
		// console.log("app create > newApp :>> ", newApp);

		try {
			newApp = await this.service.create(body);
			if (!newApp) return { status: 0, messages: [`Failed to update app at "${JSON.stringify(this.filter)}"`] } as ResponseData;
		} catch (e) {
			return { status: 0, messages: [e.message] } as ResponseData;
		}

		// migrate app environment variables if needed (convert {Object} to {Array})
		const migratedApp = await migrateAppEnvironmentVariables(newApp);
		if (migratedApp) newApp = migratedApp;
		console.log("newApp :>> ", newApp);

		if (project) {
			const newAppId = (newApp as App)._id;
			const projectApps = [...(project.apps || []), newAppId];
			// console.log("projectApps :>> ", projectApps);
			[project] = await projectSvc.update({ _id: project._id }, { apps: projectApps });
		}

		return { status: 1, data: newApp, messages: [""] } as ResponseData;
	}

	@Security("jwt")
	@Patch("/")
	async update(@Body() body: Omit<App, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		let project: Project,
			projectSvc = new ProjectService();

		if (body.project) {
			project = await projectSvc.findOne({ _id: new ObjectId(body.project as string) });
			if (!project) return { status: 0, messages: [`Project "${body.project}" not found.`] } as ResponseData;
			body.projectSlug = project.slug;
		}

		// body.deployEnvironment = convertBodyDeployEnvironmentObject(body);
		// console.log("body :>> ", body);

		let app: App;
		try {
			[app] = await this.service.update(this.filter, body, this.options);
			if (!app) return { status: 0, messages: [`Failed to update app at "${JSON.stringify(this.filter)}"`] } as ResponseData;
		} catch (e) {
			return { status: 0, messages: [e.message] } as ResponseData;
		}

		// migrate app environment variables if needed (convert {Object} to {Array})
		app = await migrateAppEnvironmentVariables(app);

		return { status: 1, data: [app] } as ResponseData;
		// return super.update(body);
	}

	@Security("jwt")
	@Delete("/")
	async delete(@Queries() queryParams?: IDeleteQueryParams) {
		const app = await this.service.findOne(this.filter, { populate: ["project"] });

		// also delete app's namespace on the cluster:
		Object.entries(app.deployEnvironment).map(async ([env, deployEnvironment]) => {
			if (!isEmpty(deployEnvironment)) {
				const { cluster, namespace } = deployEnvironment;
				try {
					await ClusterManager.authCluster(cluster);
					await ClusterManager.deleteNamespaceByCluster(namespace, cluster);
					log(`[APP DELETE] ${app.slug} > Deleted "${namespace}" namespace on "${cluster}" cluster.`);
				} catch (e) {
					logWarn(`[APP DELETE] ${app.slug} > Can't delete "${namespace}" namespace on "${cluster}" cluster:`, e);
				}
			}
		});

		// remove this app ID from project.apps
		const [project] = await new ProjectService().update(
			{
				_id: (app.project as Project)._id,
			},
			{
				$pull: { apps: app._id },
			},
			{ raw: true }
		);
		return super.delete();
	}

	@Security("jwt")
	@Get("/config")
	async getAppConfig(@Queries() queryParams?: { slug: string }) {
		const app = await this.service.findOne(this.filter, { populate: ["project", "owner", "workspace"] });
		if (!app) return { status: 0, messages: [`App not found.`], data: undefined };

		const appConfig = getAppConfigFromApp(app);

		let result = { status: 1, data: appConfig, messages: [] };
		return result;
	}

	/**
	 * Create new deploy environment of the application.
	 */
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
		if (!slug) return { status: 0, messages: [`App slug is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name is required.`] };

		const app = await this.service.findOne({ slug });
		if (!app) return { status: 0, messages: [`App "${slug}" not found.`] };
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${slug}" doesn't have any deploy environment named "${env}".`] };

		const deployEnvironment = app.deployEnvironment[env];
		let result = { status: 1, data: deployEnvironment, messages: [""] };
		return result;
	}

	/**
	 * Create new deploy environment of the application.
	 */
	@Security("jwt")
	@Post("/environment")
	async createDeployEnvironment(
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
			 * Deploy environment configuration
			 */
			clientDeployEnvironment: ClientDeployEnvironmentConfig;
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		const { slug, env, clientDeployEnvironment } = body;
		if (!slug) return { status: 0, messages: [`App slug is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name is required.`] };
		if (!clientDeployEnvironment) return { status: 0, messages: [`Deploy environment configuration is required.`] };

		const [updatedApp] = await this.service.update(
			{ slug },
			{
				[`deployEnvironment.${env}`]: clientDeployEnvironment,
			}
		);
		if (!updatedApp) return { status: 0, messages: [`Failed to create "${env}" deploy environment.`] };

		const { data: appConfig } = await this.getAppConfig({ slug });

		let result = { status: 1, data: appConfig, messages: [] };
		return result;
	}

	/**
	 * Delete a deploy environment of the application.
	 */
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
		let result = { status: 1, data: {}, messages: [] } as ResponseData & { data: App };

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
		const appFilter = typeof id != "undefined" ? { _id: new ObjectId(id) } : { slug };
		const app = await this.service.findOne(appFilter);

		// check if the environment is existed
		if (!app) {
			result.status = 0;
			result.messages.push(`App not found.`);
			return result;
		}

		const deployEnvironment = (app.deployEnvironment || {})[env.toString()];
		if (!deployEnvironment) {
			result.status = 0;
			result.messages.push(`App environment "${env}" not found.`);
			return result;
		}

		// take down the deploy environment
		const envConfig = await getDeployEvironmentByApp(app, env.toString());
		const { cluster, namespace } = envConfig;
		if (!cluster) logWarn(`[BaseController] deleteEnvironment`, { appFilter }, ` :>> Cluster "${cluster}" not found.`);
		if (!namespace) logWarn(`[BaseController] deleteEnvironment`, { appFilter }, ` :>> Namespace "${namespace}" not found.`);

		let errorMsg;
		try {
			// switch to the cluster of this environment
			await ClusterManager.authCluster(cluster);

			// TODO: Should NOT delete namespace because it will affect other apps in a project!
			// delete the whole namespace of this environment
			await ClusterManager.deleteNamespaceByCluster(namespace, cluster);
		} catch (e) {
			logError(`[BaseController] deleteEnvironment (${cluster} - ${namespace}) :>>`, e);
			errorMsg = e.message;
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
	@Security("jwt")
	@Get("/environment/variables")
	async getEnvVarsOnDeployEnvironment(@Queries() queryParams?: { slug: string; env: string }) {
		const { slug, env } = this.filter;
		if (!slug) return { status: 0, messages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };

		const app = await this.service.findOne({ slug });
		if (!app) return { status: 0, messages: [`App "${slug}" not found.`] };

		const envVars = app.deployEnvironment[env].envVars || [];

		let result = { status: 1, data: envVars, messages: [] };
		return result;
	}

	/**
	 * Create new variables on the deploy environment of the application.
	 */
	@Security("jwt")
	@Post("/environment/variables")
	async createEnvVarsOnDeployEnvironment(
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
			 * Array of variables to be created on deploy environment
			 */
			envVars: KubeEnvironmentVariable[];
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		// console.log("body :>> ", body);
		// return { status: 0 };
		let { slug, env, envVars } = body;
		if (!slug) return { status: 0, messages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messages: [`Deploy environment name (env) is required.`] };
		if (!envVars) return { status: 0, messages: [`Array of variables in JSON format (envVars) is required.`] };
		if (!isJSON(envVars)) return { status: 0, messages: [`Array of variables (envVars) is not a valid JSON.`] };

		const newEnvVars = JSON.parse(envVars as unknown as string) as KubeEnvironmentVariable[];
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
		const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
		const setEnvVarsRes = await ClusterManager.setEnvVarByFilter(newEnvVars, namespace, {
			context: cluster.contextName,
			filterLabel: `main-app=${slug}`,
		});

		let result = { status: 1, data: updatedApp.deployEnvironment[env].envVars, messages: [setEnvVarsRes] };
		return result;
	}

	/**
	 * Update a variable on the deploy environment of the application.
	 */
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
		if (!isJSON(envVar)) return { status: 0, messages: [`A variable (envVar { name, value }) should be a valid JSON format.`] };

		const app = await this.service.findOne({ slug });
		if (!app) return { status: 0, messages: [`App "${slug}" not found.`] };
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${slug}" doesn't have any deploy environment named "${env}".`] };

		envVar = JSON.parse(envVar as unknown as string) as KubeEnvironmentVariable;

		const envVars = app.deployEnvironment[env].envVars || [];
		const varToBeUpdated = envVars.find((v) => v.name === envVar.name);

		let updatedApp: App;

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
		const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
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

		const app = await this.service.findOne({ slug });
		if (!app) return { status: 0, messages: [`App "${slug}" not found.`] };
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
		const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
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
}
