import { log, logError, logFull, logWarn } from "diginext-utils/dist/console/log";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { App, Project, User, Workspace } from "@/entities";
import type { AppConfig, ClientDeployEnvironmentConfig, HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { getAppEvironment } from "@/modules/apps/get-app-environment";
import ClusterManager from "@/modules/k8s";
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
	create(@Body() body: Omit<App, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<App, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Security("jwt")
	@Get("/config")
	async getAppConfig(@Queries() queryParams?: { slug: string }) {
		const app = await this.service.findOne(this.filter, { populate: ["project", "owner", "workspace"] });

		// hide confidential information:

		const clientDeployEnvironment: { [key: string]: ClientDeployEnvironmentConfig } = {};
		Object.entries(app.deployEnvironment).map(([env, deployEnvironment]) => {
			const { deploymentYaml, prereleaseDeploymentYaml, prereleaseUrl, envVars, cliVersion, namespaceYaml, ..._clientDeployEnvironment } =
				app.deployEnvironment[env];

			clientDeployEnvironment[env] = _clientDeployEnvironment[env] as ClientDeployEnvironmentConfig;
		});

		const appConfig: AppConfig = {
			name: app.name,
			slug: app.slug,
			owner: (app.owner as User).slug,
			workspace: (app.workspace as Workspace).slug,
			project: (app.project as Project).slug,
			framework: app.framework,
			git: app.git,
			environment: clientDeployEnvironment,
		};

		let result = { status: 1, data: appConfig, messages: [] };
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
		const envConfig = await getAppEvironment(app, env.toString());
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
}
