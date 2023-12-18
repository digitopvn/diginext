import dayjs from "dayjs";
import { logError } from "diginext-utils/dist/xconsole/log";

import type { IRelease } from "@/entities";
import type { DeployStatus } from "@/interfaces/SystemTypes";

export async function updateReleaseStatus(release: IRelease, status: DeployStatus, options?: { env?: string; isDebugging?: boolean }) {
	const { DB } = await import("@/modules/api/DB");

	if (!release) {
		logError(`[DEPLOYING] updateReleaseStatus > "build" is required.`);
		return;
	}

	const startTime = release.startTime ? dayjs(release.startTime) : undefined;
	const endTime = status === "failed" || status === "success" ? new Date() : undefined;
	const duration = endTime ? dayjs(endTime).diff(startTime, "millisecond") : undefined;

	const updatedRelease = await DB.updateOne("release", { _id: release._id }, { status, endTime, duration }, { populate: ["project"] });
	if (!updatedRelease) {
		logError(`[DEPLOYING] updateReleaseStatus >> error!`);
		return;
	}

	return updatedRelease;
}

export async function updateReleaseStatusById(releaseId: string, status: DeployStatus, options?: { env?: string; isDebugging?: boolean }) {
	const { DB } = await import("../api/DB");

	// find the existing releasse
	const release = await DB.findOne("release", { _id: releaseId });
	if (!release) throw new Error(`Release "${releaseId}" not found.`);

	return updateReleaseStatus(release, status, options);
}
