import { logSuccess } from "diginext-utils/dist/xconsole/log";
import mongoose from "mongoose";

import type { IBuild, IRelease } from "@/entities";
import { buildSchema, releaseSchema } from "@/entities";

/**
 * Mark all builds & releases with "in_progress" status longer than 1 hour as "failed"
 */
export async function markLongRunningBuildAndReleaseAsFailed() {
	const BuildModel = mongoose.model<IBuild>("builds", buildSchema, "builds");
	const builds = await BuildModel.updateMany(
		{
			status: "building",
			createdAt: {
				// longer than 1 hour
				$lt: new Date(Date.now() - 1000 * 60 * 60 * 1),
			},
		},
		{ status: "failed", endTime: new Date() }
	);
	// console.log("builds.modifiedCount :>> ", builds.modifiedCount);

	const ReleaseModel = mongoose.model<IRelease>("releases", releaseSchema, "releases");
	const releases = await ReleaseModel.updateMany(
		{
			status: "in_progress",
			createdAt: {
				// longer than 1 hour
				$lt: new Date(Date.now() - 1000 * 60 * 60 * 1),
			},
		},
		{ status: "failed", endTime: new Date() }
	);
	// console.log("releases.modifiedCount :>> ", releases.modifiedCount);

	const result = { buildCount: builds.modifiedCount, releaseCount: releases.modifiedCount };
	if (result.buildCount > 0 || result.releaseCount > 0) logSuccess("markLongRunningBuildAndReleaseAsFailed() > result :>> ", result);
	return result;
}
