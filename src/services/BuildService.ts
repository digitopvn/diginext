import { Config } from "@/app.config";
import type { IBuild } from "@/entities/Build";
import { buildSchema } from "@/entities/Build";
import type { Ownership } from "@/interfaces/SystemTypes";
import type { StartBuildParams } from "@/modules/build";
import * as buildModule from "@/modules/build";
import { checkQuota } from "@/modules/workspace/check-quota";

import BaseService from "./BaseService";

export default class BuildService extends BaseService<IBuild> {
	constructor() {
		super(buildSchema);
	}

	async startBuild(data: StartBuildParams, ownership: Ownership) {
		// check dx quota
		const quotaRes = await checkQuota(ownership.workspace);
		if (!quotaRes.status) throw new Error(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed) throw new Error(`You've exceeded the limit amount of concurrent builds.`);

		// default values
		if (ownership.owner) data.user = ownership.owner;

		// validates
		const { appSlug, buildNumber, user, userId, gitBranch, registrySlug } = data;
		if (!appSlug) throw new Error(`App slug is required.`);
		if (!buildNumber) throw new Error(`Build number is required.`);
		if (!user && !userId) throw new Error(`User or UserID is required.`);
		if (!gitBranch) throw new Error(`Git branch is required.`);
		if (!registrySlug) throw new Error(`Container registry slug is required.`);

		// start the build
		const buildInfo = await buildModule.startBuild(data);

		const buildServerUrl = Config.BASE_URL;
		const SOCKET_ROOM = `${appSlug}-${buildNumber}`;
		const logURL = `${buildServerUrl}/build/logs?build_slug=${SOCKET_ROOM}`;

		return { logURL, ...buildInfo };
	}

	async stopBuild(slug: string, ownership?: Ownership) {
		// const { slug } = data;
		// console.log("slug :>> ", slug);
		// return ApiResponse.failed(res, `${slug}`);

		if (!slug) throw new Error(`Build "slug" is required.`);

		let build = await this.findOne({ slug });
		if (!build) throw new Error(`Build "${slug}" not found.`);

		const stoppedBuild = await buildModule.stopBuild(build.projectSlug, build.appSlug, slug.toString());
		if ((stoppedBuild as { error: string })?.error) throw new Error((stoppedBuild as { error: string }).error);

		build = await this.updateOne({ _id: build._id }, { status: "failed" });
		return build;
	}
}

export { BuildService };
