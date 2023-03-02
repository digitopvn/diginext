import { isJSON } from "class-validator";
import { log } from "diginext-utils/dist/console/log";
import type { NextFunction, Request, Response } from "express";
import { Body, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import pkg from "@/../package.json";
import type { User } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { IPostQueryParams } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import { startBuild } from "@/modules/build";
import type { DeployImageParams } from "@/modules/deploy/deploy-image";
import { deployImage } from "@/modules/deploy/deploy-image";
import { AppService } from "@/services";

@Tags("Deploy")
@Route("deploy")
export default class DeployController {
	user?: User;

	apiRespond(executor) {
		return async (req: Request, res: Response, next: NextFunction) => {
			this.user = req.user as User;
			let result = await executor(req.body);
			return res.status(200).json(result);
		};
	}

	@Security("jwt")
	@Post("/")
	async deployFromSource(@Body() body: { options: InputOptions }, @Queries() queryParams?: IPostQueryParams) {
		const { options } = body;
		log("[DEPLOY] options", options);

		// TODO: Save client CLI version to server database for tracking purpose!

		log(`deployFromSource > options.buildNumber :>>`, options.buildNumber);

		// check for version compatibility between CLI & SERVER:
		const cliVersion = options.version || "0.0.0";
		const breakingChangeVersionCli = cliVersion.split(".")[0];
		const serverVersion = pkg.version;
		const breakingChangeVersionServer = serverVersion.split(".")[0];

		if (breakingChangeVersionCli != breakingChangeVersionServer)
			return {
				status: 0,
				messages: [
					`Your CLI version (${cliVersion}) is much lower than the BUILD SERVER version (${serverVersion}). Please upgrade: "dx update"`,
				],
			};

		// start build in background:
		const result = await startBuild(options);
		if (!result) return { status: 0, messages: [`Failed to build & deploy.`] };
		return { messages: [], status: 1, data: result };
	}

	@Security("jwt")
	@Post("/from-image")
	async deployFromImage(
		@Body()
		body: {
			/**
			 * Project's slug
			 */
			projectSlug: string;
			/**
			 * App's slug
			 */
			slug: string;
			/**
			 * @example "dev" | "prod"
			 */
			env?: string;
			/**
			 * CLI's version
			 */
			cliVersion?: string;
			/**
			 * Kubernetes Environment Variables in JSON Array
			 * @example [ { "name": "TZ", "value": "Asia/Ho_Chi_Minh" } ]
			 */
			envVars?: string;
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		const { env, projectSlug, slug, envVars: envVarsStr, cliVersion } = body;
		if (!projectSlug) return { status: 0, messages: [`Project "slug" is required`] };
		if (!slug) return { status: 0, messages: [`App "slug" is required`] };

		const appSvc = new AppService();
		const app = await appSvc.findOne({ slug }, { populate: ["workspace"] });

		if (!app) return { status: 0, messages: [`App "${slug}" not found.`] };

		const appConfig = getAppConfigFromApp(app);

		const envVars: KubeEnvironmentVariable[] = isJSON(envVarsStr) ? JSON.parse(envVarsStr) : [];

		const params = {
			projectSlug,
			slug,
			env,
			envVars,
			workspace: this.user?.activeWorkspace,
			username: this.user?.slug,
			workspaceId: app.workspace,
			cliVersion,
		} as DeployImageParams;

		const result = await deployImage(params, appConfig, envVars);

		if (!result) return { status: 0, messages: [`Failed to deploy from image URL.`] };

		return { messages: [], status: 1, data: result };
	}
}
