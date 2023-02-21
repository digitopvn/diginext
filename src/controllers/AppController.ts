import { log, logError, logFull, logWarn } from "diginext-utils/dist/console/log";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { App } from "@/entities";
import type { DeployEnvironment, HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
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
	@Delete("/environment")
	async deleteEnvironment(@Queries() queryParams?: { _id: string; id: string; slug: string; env: string }) {
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
		const envConfig = app.environment[env.toString()] as DeployEnvironment;
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
