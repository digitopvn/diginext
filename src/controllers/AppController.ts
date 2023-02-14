import { log, logError, logFull, logWarn } from "diginext-utils/dist/console/log";
import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

import type { DeployEnvironment } from "@/interfaces";
import ClusterManager from "@/modules/k8s";
import AppService from "@/services/AppService";

import BaseController from "./BaseController";

export default class AppController extends BaseController<AppService> {
	constructor() {
		super(new AppService());
	}

	async deleteEnvironment(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		// input validation
		let { _id, id, slug, env } = req.query;
		if (!id && _id) id = _id;
		if (!id && !slug) return ApiResponse.failed(res, `App "id" or "slug" is required.`);
		if (!env) return ApiResponse.failed(res, `App "env" is required.`);

		// find the app
		const appFilter = typeof id != "undefined" ? { id } : { slug };
		const app = await this.service.findOne(appFilter);

		// check if the environment is existed
		if (!app) return ApiResponse.failed(res, `App not found.`);
		const { environment } = app;
		if (!environment[env.toString()]) return ApiResponse.failed(res, `App environment "${env}" not found.`);

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
		return ApiResponse.succeed(res, updatedApp);
	}
}
