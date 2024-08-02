import { Config } from "@/app.config";
import type { DeployBuildParams } from "@/controllers/DeployController";
import type { IBuild, IRelease, IUser, IWorkspace } from "@/entities";
import type { Ownership } from "@/interfaces/SystemTypes";
import type { StartBuildParams } from "@/modules/build";
import { buildAndDeploy } from "@/modules/build/build-and-deploy";
import { createBuildSlug } from "@/modules/deploy/create-build-slug";
import { type DeployBuildOptions, deployBuild } from "@/modules/deploy/deploy-build";
import { deployBuildV2 } from "@/modules/deploy/deploy-build-v2";
import { deployRelease } from "@/modules/deploy/deploy-release";
import type { PromoteDeployEnvironmentOptions } from "@/modules/deploy/promote-deploy-environment";
import { promoteDeployEnvironment } from "@/modules/deploy/promote-deploy-environment";
import { currentVersion } from "@/plugins";

export default class DeployService {
	/**
	 * Current login user
	 */
	user?: IUser;

	/**
	 * Current active workspace
	 */
	workspace?: IWorkspace;

	/**
	 * Current owner & workspace
	 */
	ownership?: Ownership;

	constructor(ownership?: Ownership) {
		this.ownership = ownership;
	}

	/**
	 * Build container image first, then deploy that build to target deploy environment.
	 */
	async buildAndDeploy(buildParams: StartBuildParams, deployParams: DeployBuildParams, ownership: Ownership) {
		const { DB } = await import("@/modules/api/DB");
		let app = await DB.updateOne("app", { slug: buildParams.appSlug }, { updatedBy: ownership.owner._id });

		// change cluster (if needed)
		if (deployParams.cluster) {
			const cluster = await DB.findOne("cluster", { slug: deployParams.cluster }, { subpath: "/all" });
			if (cluster) app = await DB.updateOne("app", { _id: app._id }, { [`deployEnvironment.${deployParams.env}.cluster`]: cluster.slug });
		}
		// change container registry (if needed)
		if (buildParams.registrySlug) deployParams.registry = buildParams.registrySlug;
		if (deployParams.registry) {
			const registry = await DB.findOne("registry", { slug: deployParams.registry }, { subpath: "/all" });
			if (registry) app = await DB.updateOne("app", { _id: app._id }, { [`deployEnvironment.${deployParams.env}.registry`]: registry.slug });
		}

		// ownership
		const author = ownership.owner || (await DB.findOne("user", { _id: deployParams.author }, { populate: ["activeWorkspace"] }));
		const workspace = author.activeWorkspace as IWorkspace;

		const deployBuildOptions: DeployBuildOptions = {
			...deployParams,
			env: deployParams.env || buildParams.env || "dev",
			cliVersion: buildParams.cliVersion,
			owner: author,
			workspace,
		};

		// check for version compatibility between CLI & SERVER:
		buildParams.user = author;

		if (buildParams.cliVersion) {
			const breakingChangeVersionCli = buildParams.cliVersion.split(".")[1];
			const serverVersion = currentVersion();
			const breakingChangeVersionServer = serverVersion.split(".")[1];

			if (breakingChangeVersionCli != breakingChangeVersionServer) {
				throw new Error(
					`Your CLI version (${buildParams.cliVersion}) is much lower than the BUILD SERVER version (${serverVersion}). Please update your CLI with: "dx update"`
				);
			}
		}

		// if (typeof buildParams.buildWatch === "undefined") buildParams.buildWatch = true;

		// start build in background process:
		// log(`buildAndDeploy > buildParams.buildTag :>>`, buildParams.buildTag);
		buildAndDeploy(buildParams, deployBuildOptions);

		const { appSlug, buildTag } = buildParams;
		const buildServerUrl = Config.BASE_URL;
		const SOCKET_ROOM = createBuildSlug({ projectSlug: app.projectSlug, appSlug, buildTag });
		const logURL = `${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM}&env=${deployParams.env}`;

		return { logURL };
	}

	/**
	 * Re-run build and deploy
	 */

	/**
	 * Deploy from a build
	 */
	async deployBuild(build: IBuild, options: DeployBuildOptions) {
		return deployBuild(build, options);
	}

	/**
	 * Deploy from a build (V2)
	 */
	async deployBuildV2(build: IBuild, options: DeployBuildOptions) {
		return deployBuildV2(build, options);
	}

	/**
	 * Deploy from a release (V2)
	 */
	async deployRelease(release: IRelease, options: DeployBuildOptions) {
		return deployRelease(release, options);
	}

	/**
	 * Promote a deploy environment to another deploy environment (default: "production").
	 */
	async promoteDeployEnvironment(options: PromoteDeployEnvironmentOptions) {
		return promoteDeployEnvironment(options);
	}
}

export { DeployService };
