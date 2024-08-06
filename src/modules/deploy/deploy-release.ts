import type { IBuild, IRelease } from "@/entities";
import { MongoDB } from "@/plugins/mongodb";

import type { DeployBuildOptions } from "./deploy-build";
import { deployBuildV2 } from "./deploy-build-v2";

export interface DeployReleaseOptions extends DeployBuildOptions {
	release: string;
	releaseSlug?: string;
}

/**
 * Deploy from a release (using V2 strategy)
 */
export const deployRelease = async (release: IRelease, options: DeployBuildOptions) => {
	if (!release) throw new Error(`[DEPLOY RELEASE] Release not found.`);
	const { DB } = await import("@/modules/api/DB");

	// find a build
	const build = (release.build as any)._id
		? (release.build as IBuild)
		: MongoDB.isValidObjectId(release.build)
		? await DB.findOne("build", { _id: release.build }, { ignorable: true })
		: undefined;

	if (!build) throw new Error(`[DEPLOY RELEASE] Build not found.`);

	return deployBuildV2(build, options);
};

export const deployWithReleaseSlug = async (releaseSlug: string, options: DeployBuildOptions) => {
	const { DB } = await import("@/modules/api/DB");
	const release = await DB.findOne("release", { slug: releaseSlug });
	if (!release) throw new Error(`[DEPLOY RELEASE] Release "${releaseSlug}" not found.`);

	return deployRelease(release, options);
};
