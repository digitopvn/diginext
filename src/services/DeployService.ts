import { Config } from "@/app.config";
import type { DeployBuildParams } from "@/controllers/DeployController";
import type { IBuild, IRelease, IUser, IWorkspace } from "@/entities";
import type { Ownership } from "@/interfaces/SystemTypes";
import type { StartBuildParams } from "@/modules/build";
import { buildAndDeploy } from "@/modules/build/build-and-deploy";
import { type DeployBuildOptions, deployBuild } from "@/modules/deploy/deploy-build";
import { deployRelease } from "@/modules/deploy/deploy-release";
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

	/**
	 * Build container image first, then deploy that build to target deploy environment.
	 */
	async buildAndDeploy(buildParams: StartBuildParams, deployParams: DeployBuildParams, ownership: Ownership) {
		const { DB } = await import("@/modules/api/DB");
		let app = await DB.updateOne("app", { slug: buildParams.appSlug }, { updatedBy: ownership.owner._id });

		// change cluster (if needed)
		if (deployParams.cluster) {
			const cluster = await DB.findOne("cluster", { slug: deployParams.cluster, workspace: ownership.workspace._id });
			if (cluster) app = await DB.updateOne("app", { _id: app._id }, { [`deployEnvironment.${deployParams.env}.cluster`]: cluster.slug });
		}
		// change container registry (if needed)
		if (buildParams.registrySlug) deployParams.registry = buildParams.registrySlug;
		if (deployParams.registry) {
			const registry = await DB.findOne("registry", { slug: deployParams.registry, workspace: ownership.workspace._id });
			if (registry) app = await DB.updateOne("app", { _id: app._id }, { [`deployEnvironment.${deployParams.env}.registry`]: registry.slug });
		}
		// fallback support deprecated "buildNumber" -> now "buildTag"
		if (buildParams.buildNumber) buildParams.buildTag = buildParams.buildNumber;

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
			const breakingChangeVersionCli = buildParams.cliVersion.split(".")[0];
			const serverVersion = currentVersion();
			const breakingChangeVersionServer = serverVersion.split(".")[0];

			if (breakingChangeVersionCli != breakingChangeVersionServer) {
				throw new Error(
					`Your CLI version (${buildParams.cliVersion}) is much lower than the BUILD SERVER version (${serverVersion}). Please update your CLI with: "dx update"`
				);
			}
		}

		// if (typeof buildParams.buildWatch === "undefined") buildParams.buildWatch = true;

		// start build in background process:
		// log(`buildAndDeploy > buildParams.buildTag :>>`, buildParams.buildTag);
		const { build, release } = await buildAndDeploy(buildParams, deployBuildOptions);

		const { appSlug, buildTag } = buildParams;
		const buildServerUrl = Config.BASE_URL;
		const SOCKET_ROOM = `${appSlug}-${buildTag}`;
		const logURL = `${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM}&env=${deployParams.env}`;

		return { logURL, build, release };
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
	 * Deploy from a release
	 */
	async deployRelease(release: IRelease, options: DeployBuildOptions) {
		return deployRelease(release, options);
	}
}

export { DeployService };
