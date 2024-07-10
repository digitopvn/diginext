import { BuildService, ReleaseService } from "@/services";

/**
 * Mark all builds & releases with "in_progress" status longer than 1 hour as "failed"
 */
export async function markLongRunningBuildAndReleaseAsFailed() {
	const buildSvc = new BuildService();
	const builds = await buildSvc.update(
		{
			status: "building",
			createdAt: {
				// longer than 1 hour
				$lt: new Date(Date.now() - 1000 * 60 * 60 * 1),
			},
		},
		{ status: "failed", endTime: new Date() },
		{ select: ["_id"] }
	);
	// console.log("markLongRunningBuildAndReleaseAsFailed() > builds :>> ", builds[0]);

	const releaseSvc = new ReleaseService();
	const releases = await releaseSvc.update(
		{
			status: "in_progress",
			createdAt: {
				// longer than 1 hour
				$lt: new Date(Date.now() - 1000 * 60 * 60 * 1),
			},
		},
		{ status: "failed", endTime: new Date() },
		{ select: ["_id"] }
	);

	const result = { buildCount: builds.length, releaseCount: releases.length };
	console.log("markLongRunningBuildAndReleaseAsFailed() > result :>> ", result);
	return result;
}
