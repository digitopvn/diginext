import { log, logError, logFull, logWarn } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { App, Project } from "@/entities";
import type { ClientDeployEnvironmentConfig, HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { ResponseData } from "@/interfaces/ResponseData";
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
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("jwt")
	@Post("/")
	async create(@Body() body: Omit<App, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		let project: Project;
		if (!body.projectSlug && body.project) {
			project = await this.service.findOne({ id: body.project });
			if (!project) return { status: 0, messages: [`Project "${body.project}" not found.`] } as ResponseData;
			body.projectSlug = project.slug;
		}

		const res = await super.create(body);
		const { data: newApp } = res;

		if (project) {
			[project] = await new ProjectService().update({ _id: project._id }, { $addToSet: { apps: project._id } }, { raw: true });
		}

		return res;
	}

	@Security("jwt")
	@Patch("/")
	async update(@Body() body: Omit<App, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		let project: Project;

		if (body.project) {
			project = await this.service.findOne({ id: body.project });
			if (!project) return { status: 0, messages: [`Project "${body.project}" not found.`] } as ResponseData;
			body.projectSlug = project.slug;
		}

		return super.update(body);
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
					await ClusterManager.auth(cluster);
					await ClusterManager.deleteNamespace(namespace);
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
		if (!slug) return { status: 0, messsages: [`App slug is required.`] };
		if (!env) return { status: 0, messsages: [`Deploy environment name is required.`] };

		const app = await this.service.findOne({ slug });
		if (!app) return { status: 0, messages: [`App "${slug}" not found.`] };
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${slug}" doesn't have any deploy environment named "${env}".`] };

		let result = { status: 1, data: app.deployEnvironment[env], messages: [] };
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
			config: ClientDeployEnvironmentConfig;
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		const { slug, env, config } = body;
		if (!slug) return { status: 0, messsages: [`App slug is required.`] };
		if (!env) return { status: 0, messsages: [`Deploy environment name is required.`] };
		if (!config) return { status: 0, messsages: [`Deploy environment configuration is required.`] };

		const [updatedApp] = await this.service.update({ slug }, { [`environment.${env}`]: config });
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
	async deleteDeployEnvironment(@Queries() queryParams?: { _id: string; id: string; slug: string; env: string }) {
		let result: ResponseData & { data: App } = { status: 1, data: {}, messages: [] };
		// input validation
		let { _id, id, slug, env } = this.filter;
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
		const appFilter = typeof id != "undefined" ? { id } : { slug };
		const app = await this.service.findOne(appFilter);

		// check if the environment is existed
		if (!app) {
			result.status = 0;
			result.messages.push(`App not found.`);
			return result;
		}

		const { environment } = app;
		if (!environment[env.toString()]) {
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
			await ClusterManager.auth(cluster);

			// delete the whole namespace of this environment
			await ClusterManager.deleteNamespace(namespace);
		} catch (e) {
			logError(`[BaseController] deleteEnvironment (${cluster} - ${namespace}) :>>`, e);
			errorMsg = e.message;
		}

		// update the app (delete the environment)
		const updatedApp = await this.service.update(appFilter, { $unset: { [`environment.${env}`]: "" } }, { raw: true });
		log(`[BaseController] deleteEnvironment`, { appFilter }, ` :>>`, { updatedApp });
		logFull({ appFilter });

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
		if (!slug) return { status: 0, messsages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messsages: [`Deploy environment name (env) is required.`] };

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
		const { slug, env, envVars } = body;
		if (!slug) return { status: 0, messsages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messsages: [`Deploy environment name (env) is required.`] };
		if (!envVars) return { status: 0, messsages: [`Array of variables (envVars) is required.`] };

		const [updatedApp] = await this.service.update({ slug }, { [`environment.${env}.envVars`]: envVars });
		if (!updatedApp) return { status: 0, messages: [`Failed to create "${env}" deploy environment.`] };

		const { data: appConfig } = await this.getAppConfig({ slug });

		let result = { status: 1, data: appConfig, messages: [] };
		return result;
	}

	/**
	 * Update a variable on the deploy environment of the application.
	 */
	@Security("jwt")
	@Patch("/environment/variables")
	async updateEnvVarsOnDeployEnvironment(
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
			envVar: KubeEnvironmentVariable;
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		const { slug, env, envVar } = body;
		if (!slug) return { status: 0, messsages: [`App slug (slug) is required.`] };
		if (!env) return { status: 0, messsages: [`Deploy environment name (env) is required.`] };
		if (!envVar) return { status: 0, messsages: [`A variable (envVar { name, value }) is required.`] };

		const app = await this.service.findOne({ slug });
		if (!app) return { status: 0, messages: [`App "${slug}" not found.`] };
		if (!app.deployEnvironment[env]) return { status: 0, messages: [`App "${slug}" doesn't have any deploy environment named "${env}".`] };

		const envVars = app.deployEnvironment[env].envVars || [];
		const varToBeUpdated = envVars.find((v) => v.name === envVar.name);

		if (varToBeUpdated) {
			// update old variable
			const updatedEnvVars = envVars.map((v) => {
				if (v.name === envVar.name) return envVar;
				return v;
			});

			const [updatedApp] = await this.service.update({ slug }, { [`environment.${env}.envVars`]: updatedEnvVars });
			if (!updatedApp)
				return { status: 0, messages: [`Failed to update "${varToBeUpdated.name}" to variables of "${env}" deploy environment.`] };
		} else {
			// create new variable
			envVars.push(envVar);
			const [updatedApp] = await this.service.update({ slug }, { [`environment.${env}.envVars`]: envVars });
			if (!updatedApp) return { status: 0, messages: [`Failed to add "${varToBeUpdated.name}" to variables of "${env}" deploy environment.`] };
		}

		const { data: appConfig } = await this.getAppConfig({ slug });

		let result = { status: 1, data: appConfig, messages: [] };
		return result;
	}
}
