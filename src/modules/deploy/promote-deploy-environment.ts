import type { IBuild } from "@/entities";

import { DB } from "../api/DB";
import type { DeployBuildV2Options } from "./deploy-build-v2";
import { deployBuildV2 } from "./deploy-build-v2";

export type PromoteDeployEnvironmentOptions = {
	/**
	 * @default false
	 */
	isDebugging?: boolean;
	/**
	 * App's slug
	 */
	appSlug: string;
	/**
	 * Original deploy environment (FROM)
	 */
	fromEnv: string;
} & DeployBuildV2Options;

export async function promoteDeployEnvironment(options: PromoteDeployEnvironmentOptions) {
	const { appSlug, fromEnv } = options;
	if (!appSlug) throw new Error(`Params "appSlug" is required.`);
	if (!fromEnv) throw new Error(`Params "env" (deploy environment) is required.`);

	const app = await DB.findOne("app", { slug: appSlug });
	if (!app) throw new Error(`App "${appSlug}" is not found.`);

	const deployEnvironment = app.deployEnvironment[fromEnv];
	const { latestRelease, port } = deployEnvironment;

	// copy port from original deploy environment
	options.port = port;

	if (!latestRelease) throw new Error(`Deploy environment "${fromEnv}" is not found.`);

	const release = await DB.findOne("release", { _id: latestRelease }, { populate: ["build"] });
	if (!release) throw new Error(`Release "${latestRelease}" is not found.`);
	if (!release.build) throw new Error(`Build of release "${latestRelease}" is not found.`);

	// default options: wait for deploy to finish
	options.deployInBackground = false;

	const build = release.build as IBuild;
	return deployBuildV2(build, options);
}
