import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { log } from "diginext-utils/dist/xconsole/log";
import { toNumber } from "lodash";
import { Body, Deprecated, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import pkg from "@/../package.json";
import type { IBuild, IUser, IWorkspace } from "@/entities";
import type { InputOptions, IQueryFilter, IQueryOptions, IResponsePagination, ResponseData } from "@/interfaces";
import { IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import { getDeployEvironmentByApp } from "@/modules/apps/get-app-environment";
import type { StartBuildParams } from "@/modules/build";
import { startBuildV1 } from "@/modules/build/start-build";
import type { DeployBuildOptions } from "@/modules/deploy/deploy-build";
import { parseGitRepoDataFromRepoSSH } from "@/modules/git/git-utils";
import { MongoDB } from "@/plugins/mongodb";
import { AppService, ClusterService, ContainerRegistryService, GitProviderService } from "@/services";
import DeployService from "@/services/DeployService";

export type DeployBuildParams = {
	/**
	 * Deploy environment
	 * @example "dev", "prod"
	 */
	env: string;
	/**
	 * `[OPTIONAL]` - Cluster's slug
	 */
	cluster?: string;
	/**
	 * `[OPTIONAL]` - Container registry's slug
	 */
	registry?: string;
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
	/**
	 * ### WARNING
	 * Skip watching the progress of deployment, let it run in background, won't return the deployment's status.
	 * @default true
	 */
	deployInBackground?: boolean;
};

@Tags("Deploy")
@Route("deploy")
export default class DeployController {
	user: IUser;

	workspace: IWorkspace;

	ownership: Ownership;

	service: DeployService = new DeployService();

	filter: IQueryFilter;

	options: IQueryOptions;

	pagination: IResponsePagination;

	appSvc = new AppService();

	regSvc = new ContainerRegistryService();

	clusterSvc = new ClusterService();

	gitSvc = new GitProviderService();

	/**
	 * ### [DEPRECATED]
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

		log(`deployFromSource > BUILD_TAG :>>`, inputOptions.buildTag);
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

		// validation
		if (!buildParams) return respondFailure(`Build "params" is required.`);
		if (!deployParams) return respondFailure(`Deploy "params" is required.`);

		// start build in background:
		try {
			const data = await this.service.buildAndDeploy(buildParams, deployParams, this.ownership);
			if (this.options?.isDebugging) console.log(`[DEPLOY CONTROLLER] buildAndDeploy > data :>> `, data);
			return respondSuccess({ data, msg: "Building..." });
		} catch (e) {
			console.error(e);
			return respondFailure(e.toString());
		}
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
		if (!body.appSlug) return respondFailure(`Data of "appSlug" is required.`);
		if (!body.deployParams) return respondFailure(`Data of "deployParams" is required.`);
		if (!body.deployParams.env) return respondFailure(`Data of "deployParams.env" is required.`);

		const app = await this.appSvc.findOne({ slug: body.appSlug });
		if (!app) return respondFailure(`App not found.`);

		const { env } = body.deployParams;

		const deployEnvironment = await getDeployEvironmentByApp(app, env);
		if (!deployEnvironment) respondFailure(`Unable to deploy: this app doesn't have any "${env}" deploy environment.`);

		// validate registry -> if this app has no registries but specified in deploy params -> move forward as it will use deploy params
		if (!deployEnvironment.registry && !body.deployParams.registry) return respondFailure(`Container registry is required.`);

		// validate cluster -> if this app has no clusters but specified in deploy params -> move forward as it will use deploy params
		if (!deployEnvironment.cluster && !body.deployParams.cluster) return respondFailure(`Cluster is required.`);

		const buildParams: StartBuildParams = {
			appSlug: body.appSlug,
			buildTag: makeDaySlug({ divider: "" }),
			gitBranch: body.gitBranch,
			registrySlug: deployEnvironment.registry || body.deployParams.registry,
		};
		const deployParams = body.deployParams;
		const buildAndDeployParams = { buildParams, deployParams };
		console.log("[DEPLOY CONTROLLER] this :>> ", this);
		return this.buildAndDeploy(buildAndDeployParams);
	}

	/**
	 * Build container image from app's git repo and deploy it to target deploy environment.
	 * - Flow: fork the git repo -> build from the new repo -> deploy to Diginext
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

		// inherit the ownership
		this.appSvc.ownership = this.ownership;

		let app = await this.appSvc.findOne({ "git.repoSSH": body.sshUrl });

		// generate new app
		if (!app) {
			// try to get default git provider
			const gitData = parseGitRepoDataFromRepoSSH(body.sshUrl);
			const gitProvider = await this.gitSvc.findOne({ type: gitData.providerType, public: true, workspace: this.workspace._id });
			if (!gitProvider) throw new Error(`Unable to deploy: no git providers (${gitData.providerType.toUpperCase()}) in this workspace.`);

			// create a new app
			try {
				app = await this.appSvc.createWithGitURL(
					body.sshUrl,
					MongoDB.toString(gitProvider._id),
					{ workspace: this.workspace, owner: this.user },
					{ gitBranch: body.gitBranch, returnExisting: true }
				);
			} catch (e) {
				return respondFailure(e.toString());
			}
		}

		// get random registry in this workspace
		const defaultRegistry = await this.regSvc.findOne({ workspace: this.workspace._id });
		if (!defaultRegistry) throw new Error(`Unable to deploy: no container registries in this workspace.`);

		// find default cluster
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

		// create deploy environment (if not exists):
		const { DeployEnvironmentService } = await import("@/services");
		const deployEnvSvc = new DeployEnvironmentService(this.ownership);
		let deployEnvironment = await getDeployEvironmentByApp(app, env);
		if (!deployEnvironment) {
			try {
				app = await deployEnvSvc.createDeployEnvironment(
					app.slug,
					{
						env,
						deployEnvironmentData: {
							registry: defaultRegistry.slug,
							cluster: cluster.slug,
							port: toNumber(body.port),
							imageURL: `${defaultRegistry.imageBaseURL}/${app.projectSlug}/${app.slug}`,
							buildTag: makeDaySlug({ divider: "" }),
						},
					},
					this.ownership
				);

				// assign new created deploy environment:
				deployEnvironment = app.deployEnvironment[env];
			} catch (e) {
				return respondFailure(e.toString());
			}
		}

		// validate deploy params
		if (!deployEnvironment.cluster) deployEnvironment.cluster = cluster.slug;
		if (!deployEnvironment.registry) deployEnvironment.registry = defaultRegistry.slug;

		// start build & deploy from source (repo):
		const buildParams: StartBuildParams = {
			appSlug: app.slug,
			buildTag: makeDaySlug({ divider: "" }),
			gitBranch: body.gitBranch,
			registrySlug: deployEnvironment.registry,
		};

		const deployParams = body.deployParams;
		deployParams.author = MongoDB.toString(this.user._id);

		const buildAndDeployParams = { buildParams, deployParams };
		return this.buildAndDeploy(buildAndDeployParams);
	}

	/**
	 * Deploy app to target environment from a "success" build.
	 */
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
		const { DB } = await import("@/modules/api/DB");
		const { buildSlug } = body;
		if (!buildSlug) return { status: 0, messages: [`Build "slug" is required`] };

		const build = await DB.findOne("build", { slug: buildSlug });
		if (!build) return respondFailure(`Build not found.`);

		const deployBuildOptions: DeployBuildOptions = {
			owner: this.user,
			workspace: this.workspace,
			env: body.env,
			shouldUseFreshDeploy: body.shouldUseFreshDeploy,
			skipReadyCheck: body.skipReadyCheck,
			forceRollOut: body.forceRollOut,
		};
		console.log("deployBuildOptions :>> ", deployBuildOptions);

		// DEPLOY A BUILD:
		try {
			const result = await this.service.deployBuild(build, deployBuildOptions);
			const { release } = result;

			if (!release) return respondFailure(`Failed to deploy from a build (${buildSlug}).`);

			return { messages: [], status: 1, data: result };
		} catch (e) {
			return respondFailure(`${e}`);
		}
	}

	/**
	 * Deploy app to target environment from a release.
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/from-release")
	async deployFromRelease(
		@Body()
		body: {
			/**
			 * Release's slug
			 */
			releaseSlug: string;
		} & DeployBuildParams,
		@Queries() queryParams?: IPostQueryParams
	) {
		const { DB } = await import("@/modules/api/DB");
		const { releaseSlug } = body;
		if (!releaseSlug) return { status: 0, messages: [`Build "slug" is required`] };

		const release = await DB.findOne("release", { slug: releaseSlug }, { populate: ["build"] });
		if (!release) return respondFailure(`Release not found.`);

		const build = release.build as IBuild;
		if (!build) return respondFailure(`Build not found.`);

		const deployBuildOptions: DeployBuildOptions = {
			owner: this.user,
			workspace: this.workspace,
			env: body.env,
			shouldUseFreshDeploy: body.shouldUseFreshDeploy,
			skipReadyCheck: body.skipReadyCheck,
			forceRollOut: body.forceRollOut,
		};
		console.log("deployBuildOptions :>> ", deployBuildOptions);

		// DEPLOY A BUILD:
		try {
			const result = await this.service.deployRelease(release, deployBuildOptions);
		} catch (e) {
			return respondFailure(e.toString());
		}
	}
}
