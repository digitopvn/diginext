import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { log } from "diginext-utils/dist/xconsole/log";
import { toNumber } from "lodash";
import path from "path";
import { Body, Deprecated, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import pkg from "@/../package.json";
import { Config } from "@/app.config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { IApp, IBuild, IUser, IWorkspace } from "@/entities";
import type { DeployEnvironment } from "@/interfaces";
import { type InputOptions, type ResponseData, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import { getDeployEvironmentByApp } from "@/modules/apps/get-app-environment";
import type { StartBuildParams } from "@/modules/build";
import { buildAndDeploy } from "@/modules/build/build-and-deploy";
import { startBuildV1 } from "@/modules/build/start-build";
import type { DeployBuildOptions } from "@/modules/deploy/deploy-build";
import { deployWithBuildSlug } from "@/modules/deploy/deploy-build";
import { parseGitRepoDataFromRepoSSH } from "@/plugins";
import { MongoDB } from "@/plugins/mongodb";
import { AppService, ClusterService, ContainerRegistryService, GitProviderService } from "@/services";

import BaseController from "./BaseController";

export type DeployBuildParams = {
	/**
	 * Deploy environment
	 * @example "dev", "prod"
	 */
	env: string;
	/**
	 * User ID of the author
	 */
	author?: string;
	/**
	 * [DANGER]
	 * ---
	 * Should delete old deployment and deploy a new one from scratch
	 * @default false
	 */
	shouldUseFreshDeploy?: boolean;
	/**
	 * ### FOR DEPLOY to PROD
	 * Force roll out the release to "prod" deploy environment (instead of "prerelease" environment)
	 * @default false
	 */
	forceRollOut?: boolean;
	/**
	 * ### WARNING
	 * Skip checking deployed POD's ready status.
	 * - The response status will always be SUCCESS even if the pod is unable to start up properly.
	 * @default false
	 */
	skipReadyCheck?: boolean;
};

@Tags("Deploy")
@Route("deploy")
export default class DeployController extends BaseController {
	appSvc = new AppService();

	regSvc = new ContainerRegistryService();

	clusterSvc = new ClusterService();

	gitSvc = new GitProviderService();

	constructor() {
		super();
		this.appSvc.req = this.regSvc.req = this.clusterSvc.req = this.gitSvc.req = this.req;
	}

	/**
	 * ### [DEPRECATED SOON]
	 * #### Use `buildAndDeploy()` instead.
	 * Build container image first, then deploy that build to target deploy environment.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/")
	@Deprecated()
	deployFromSource(@Body() body: { options: InputOptions }, @Queries() queryParams?: IPostQueryParams) {
		let { options: inputOptions } = body;

		// console.log("deployFromSource :>> ", body);

		// validation & conversion...
		if (!inputOptions) return { status: 0, messages: [`Deploy "options" is required.`] } as ResponseData;
		// if (!isJSON(inputOptions)) return { status: 0, messages: [`Deploy "options" is invalid (should be in JSON format).`] } as ResponseData;

		// const options = JSON.parse(inputOptions as string) as InputOptions;
		// log("[DEPLOY] options", options);

		// TODO: Save client CLI version to server database for tracking purpose!

		// check for version compatibility between CLI & SERVER:
		const cliVersion = inputOptions.version || "0.0.0";
		const breakingChangeVersionCli = cliVersion.split(".")[0];
		const serverVersion = pkg.version;
		const breakingChangeVersionServer = serverVersion.split(".")[0];

		if (breakingChangeVersionCli != breakingChangeVersionServer) {
			return {
				status: 0,
				messages: [
					`Your CLI version (${cliVersion}) is much lower than the BUILD SERVER version (${serverVersion}). Please upgrade: "dx update"`,
				],
			};
		}
		// return respondSuccess({ msg: `Building...` });

		log(`deployFromSource > options.buildNumber :>>`, inputOptions.buildNumber);
		startBuildV1(inputOptions);

		// start build in background:
		return respondSuccess({ msg: `Building...` });
	}

	/**
	 * Build container image first, then deploy that build to target deploy environment.
	 * - `Alias of "/api/v1/deploy/from-source"`
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/build-first")
	async buildAndDeploy(
		@Body() body: { buildParams: StartBuildParams; deployParams: DeployBuildParams },
		@Queries() queryParams?: IPostQueryParams
	) {
		let { buildParams, deployParams } = body;

		// validation & conversion...
		if (!buildParams) return { status: 0, messages: [`Build "params" is required.`] } as ResponseData;
		if (!deployParams) return { status: 0, messages: [`Deploy "params" is required.`] } as ResponseData;

		const app = await DB.findOne<IApp>("app", { slug: buildParams.appSlug });
		const author = this.user || (await DB.findOne<IUser>("user", { _id: deployParams.author }, { populate: ["activeWorkspace"] }));
		const workspace = author.activeWorkspace as IWorkspace;
		const SOURCE_CODE_DIR = `cache/${app.projectSlug}/${app.slug}/${buildParams.gitBranch}`;
		const buildDirectory = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE_DIR);

		const deployBuildOptions: DeployBuildOptions = {
			env: deployParams.env || buildParams.env || "dev",
			shouldUseFreshDeploy: deployParams.shouldUseFreshDeploy,
			author,
			workspace,
			buildDirectory,
		};

		// check for version compatibility between CLI & SERVER:
		buildParams.user = author;

		if (buildParams.cliVersion) {
			const breakingChangeVersionCli = buildParams.cliVersion.split(".")[0];
			const serverVersion = pkg.version;
			const breakingChangeVersionServer = serverVersion.split(".")[0];

			if (breakingChangeVersionCli != breakingChangeVersionServer) {
				return respondFailure(
					`Your CLI version (${buildParams.cliVersion}) is much lower than the BUILD SERVER version (${serverVersion}). Please update your CLI with: "dx update"`
				);
			}
		}

		// if (typeof buildParams.buildWatch === "undefined") buildParams.buildWatch = true;

		log(`buildAndDeploy > buildParams.buildNumber :>>`, buildParams.buildNumber);
		try {
			buildAndDeploy(buildParams, deployBuildOptions);
		} catch (e) {
			return respondFailure(`${e}`);
		}

		const { appSlug, buildNumber } = buildParams;
		const buildServerUrl = Config.BASE_URL;
		const SOCKET_ROOM = `${appSlug}-${buildNumber}`;
		const logURL = `${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM}`;

		// start build in background:
		return { messages: [`Building...`], status: 1, data: { logURL } };
	}

	/**
	 * Build container image first, then deploy that build to target deploy environment.
	 * - `Alias of "/api/v1/deploy/build-first"`
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/from-source")
	buildFromSourceAndDeploy(
		@Body() body: { buildParams: StartBuildParams; deployParams: DeployBuildParams },
		@Queries() queryParams?: IPostQueryParams
	) {
		return this.buildAndDeploy(body);
	}

	/**
	 * Build container image from app's git repo and deploy it to target deploy environment.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/from-app")
	async buildFromAppAndDeploy(
		@Body()
		body: {
			/**
			 * App's slug
			 */
			appSlug: string;
			/**
			 * Target git branch to build and deploy
			 */
			gitBranch: string;
			deployParams: DeployBuildParams;
		}
	) {
		if (!body.appSlug) return respondFailure(`Data of "appId" is required.`);
		if (!body.deployParams) return respondFailure(`Data of "deployParams" is required.`);
		if (!body.deployParams.env) return respondFailure(`Data of "deployParams.env" is required.`);

		const app = await this.appSvc.findOne({ slug: body.appSlug });
		if (!app) return respondFailure(`App not found.`);

		const { env } = body.deployParams;

		const deployEnvironment = await getDeployEvironmentByApp(app, env);
		if (!deployEnvironment) respondFailure(`Unable to deploy: this app doesn't have any "${env}" deploy environment.`);

		// const registry = await this.regSvc.findOne({ slug: deployEnvironment.registry });
		if (!deployEnvironment.registry) return respondFailure(`Container registry "${deployEnvironment.registry}" not found.`);

		const buildParams: StartBuildParams = {
			appSlug: body.appSlug,
			buildNumber: makeDaySlug({ divider: "" }),
			gitBranch: body.gitBranch,
			registrySlug: deployEnvironment.registry,
		};
		const deployParams = body.deployParams;
		const buildAndDeployParams = { buildParams, deployParams };
		return this.buildAndDeploy(buildAndDeployParams);
	}

	/**
	 * Build container image from app's git repo and deploy it to target deploy environment.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/from-git")
	async buildFromGitRepoAndDeploy(
		@Body()
		body: {
			/**
			 * Git repo SSH url
			 */
			sshUrl: string;
			/**
			 * Target git branch to build and deploy
			 */
			gitBranch: string;
			/**
			 * Cluster's slug
			 * - **CAUTION: will take the default or random cluster if not specified**.
			 */
			clusterSlug?: string;
			/**
			 * Exposed port
			 */
			port: string;
			deployParams: DeployBuildParams;
		}
	) {
		if (!body.sshUrl) return respondFailure(`Data of "sshUrl" is required.`);
		if (!body.deployParams) return respondFailure(`Data of "deployParams" is required.`);

		// deploy "dev" environment by default
		if (!body.deployParams.env) body.deployParams.env = "dev";

		const { env } = body.deployParams;

		let app = await this.appSvc.findOne({ [`git.repoSSH`]: body.sshUrl });

		// generate new app
		let deployEnvironment: DeployEnvironment;
		if (!app) {
			// try to get default git provider
			const gitData = parseGitRepoDataFromRepoSSH(body.sshUrl);
			const gitProvider = await this.gitSvc.findOne({ type: gitData.gitProvider, public: true, workspace: this.workspace._id });
			if (!gitProvider) throw new Error(`Unable to deploy: no git providers (${gitData.gitProvider.toUpperCase()}) in this workspace.`);

			// create a new app
			app = await this.appSvc.createWithGitURL(body.sshUrl, MongoDB.toString(gitProvider._id));

			// get random registry in this workspace
			const registry = await this.regSvc.findOne({ workspace: this.workspace._id });
			if (!registry) throw new Error(`Unable to deploy: no container registries in this workspace.`);

			// find cluster
			let cluster = body.clusterSlug ? await this.clusterSvc.findOne({ slug: body.clusterSlug, workspace: this.workspace._id }) : undefined;
			// get default cluster
			if (!cluster) {
				const defaultCluster = await this.clusterSvc.findOne({ isDefault: true, workspace: this.workspace._id });
				if (defaultCluster) cluster = defaultCluster;
			}
			// get random cluster
			if (!cluster) {
				const randomCluster = await this.clusterSvc.findOne({ workspace: this.workspace._id });
				if (randomCluster) cluster = randomCluster;
			}
			if (!cluster) throw new Error(`Unable to deploy: no clusters in this workspace.`);

			// generate new environment
			app = await this.appSvc.createDeployEnvironment(
				app.slug,
				{
					env,
					deployEnvironmentData: {
						registry: registry.slug,
						cluster: cluster.slug,
						port: toNumber(body.port),
						imageURL: `${registry.imageBaseURL}/${app.projectSlug}/${app.slug}`,
						buildNumber: makeDaySlug({ divider: "" }),
					},
				},
				{ owner: this.user._id }
			);
		}

		deployEnvironment = await getDeployEvironmentByApp(app, env);
		if (!deployEnvironment) respondFailure(`Unable to deploy: this app doesn't have any "${env}" deploy environment.`);

		// const registry = await this.regSvc.findOne({ slug: deployEnvironment.registry });
		if (!deployEnvironment.registry) return respondFailure(`Container registry "${deployEnvironment.registry}" not found.`);

		const buildParams: StartBuildParams = {
			appSlug: app.slug,
			buildNumber: makeDaySlug({ divider: "" }),
			gitBranch: body.gitBranch,
			registrySlug: deployEnvironment.registry,
		};
		const deployParams = body.deployParams;
		const buildAndDeployParams = { buildParams, deployParams };
		return this.buildAndDeploy(buildAndDeployParams);
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/from-build")
	async deployFromBuild(
		@Body()
		body: {
			/**
			 * Build's slug
			 */
			buildSlug: string;
		} & DeployBuildParams,
		@Queries() queryParams?: IPostQueryParams
	) {
		const { buildSlug } = body;
		if (!buildSlug) return { status: 0, messages: [`Build "slug" is required`] };

		const build = await DB.findOne<IBuild>("build", { slug: buildSlug });
		const workspace = await DB.findOne<IWorkspace>("workspace", { _id: build.workspace });
		const author = this.user || (await DB.findOne<IUser>("user", { _id: body.author }));

		if (!author) return respondFailure({ msg: `Author is required.` });

		const SOURCE_CODE_DIR = `cache/${build.projectSlug}/${build.appSlug}/${build.branch}`;
		const buildDirectory = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE_DIR);

		const deployBuildOptions: DeployBuildOptions = {
			author,
			env: body.env,
			shouldUseFreshDeploy: body.shouldUseFreshDeploy,
			workspace,
			buildDirectory,
			skipReadyCheck: body.skipReadyCheck,
			forceRollOut: body.forceRollOut,
		};
		console.log("deployBuildOptions :>> ", deployBuildOptions);

		// DEPLOY A BUILD:
		try {
			const result = await deployWithBuildSlug(buildSlug, deployBuildOptions);
			const { release } = result;

			if (!release) return { status: 0, messages: [`Failed to deploy from a build (${buildSlug}).`] };

			return { messages: [], status: 1, data: result };
		} catch (e) {
			return respondFailure(`${e}`);
		}
	}
}
