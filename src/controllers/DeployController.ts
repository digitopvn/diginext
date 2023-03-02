import { log } from "diginext-utils/dist/console/log";
import { Body, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import pkg from "@/../package.json";
import type { AppConfig, InputOptions } from "@/interfaces";
import { IPostQueryParams } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import { startBuild } from "@/modules/build";
import type { DeployImageParams } from "@/modules/deploy/deploy-image";
import { deployImage } from "@/modules/deploy/deploy-image";

@Tags("Deploy")
@Route("deploy")
export default class DeployController {
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
		@Body() body: { params: DeployImageParams; appConfig: AppConfig; envVars?: KubeEnvironmentVariable[] },
		@Queries() queryParams?: IPostQueryParams
	) {
		const { params, appConfig, envVars } = body;
		if (!params) return { status: 0, messages: [`Deployment "params" is required`] };
		if (!appConfig) return { status: 0, messages: [`Deployment "appConfig" is required`] };

		const result = await deployImage(params, appConfig, envVars);
		if (!result) return { status: 0, messages: [`Failed to deploy from image URL.`] };
		return { messages: [], status: 1, data: result };
	}
}
