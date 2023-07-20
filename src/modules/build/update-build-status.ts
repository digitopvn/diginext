import dayjs from "dayjs";
import { log, logError } from "diginext-utils/dist/xconsole/log";

import type { IBuild, IProject } from "@/entities";
import type { BuildStatus } from "@/interfaces/SystemTypes";

export async function updateBuildStatus(build: IBuild, status: BuildStatus, options?: { env?: string; isDebugging?: boolean }) {
	const { DB } = await import("@/modules/api/DB");

	if (!build) {
		logError(`[START BUILD] updateBuildStatus > "build" is required.`);
		return;
	}

	const appId = (build.app as any)?._id ? (build.app as any)._id : build.app;
	if (options?.isDebugging) log(`[START BUILD] updateBuildStatus > appId :>>`, appId);

	const startTime = build.startTime ? dayjs(build.startTime) : undefined;
	const endTime = status === "failed" || status === "success" ? new Date() : undefined;
	const duration = endTime ? dayjs(endTime).diff(startTime, "millisecond") : undefined;

	const updatedBuild = await DB.updateOne("build", { _id: build._id }, { status, endTime, duration }, { populate: ["project"] });
	if (!updatedBuild) {
		logError(`[START BUILD] updateBuildStatus >> error!`);
		return;
	}

	// update latest build to current app
	const updateDto: any = { latestBuild: build.slug };
	if (options?.env && status === "success") updateDto[`deployEnvironment.${options.env}.buildTag`] = build.tag;
	if (options?.isDebugging) log(`[START BUILD] updateBuildStatus > updateDto :>>`, updateDto);

	const updatedApp = await DB.updateOne("app", { _id: appId }, updateDto);
	if (options?.isDebugging) log(`[START BUILD] updateBuildStatus > updatedApp :>>`, updatedApp);

	if (updatedApp) {
		const updatedProject = await DB.updateOne("project", { _id: updatedApp.project }, { latestBuild: build.slug });
		if (options?.isDebugging) log(`[START BUILD] updateBuildStatus > updatedProject :>>`, updatedProject);
	}

	return updatedBuild;
}

export async function updateBuildStatusByAppSlug(appSlug: string, buildSlug: string, buildStatus: BuildStatus) {
	const { DB } = await import("../api/DB");

	// find the existing project
	if (!appSlug) {
		logError(`[START BUILD] updateBuildStatus > "appSlug" is required.`);
		return;
	}

	const app = await DB.findOne("app", { slug: appSlug }, { populate: ["project"] });
	if (!app) return;

	// update latest build to current project
	let projectSlug = (app.project as IProject).slug;
	// log(`[START BUILD] updateBuildStatus > projectSlug :>>`, projectSlug);

	const [updatedProject] = await DB.update("project", { slug: projectSlug }, { latestBuild: buildSlug });
	// log(`[START BUILD] updateBuildStatus > updatedProject :>>`, updatedProject.latestBuild);

	// update latest build to current app
	const [updatedApp] = await DB.update("app", { slug: appSlug }, { latestBuild: buildSlug });
	// log(`[START BUILD] updateBuildStatus > updatedApp :>>`, updatedApp.latestBuild);

	// update build's status on server
	const [updatedBuild] = await DB.update("build", { slug: buildSlug }, { status: buildStatus }, { populate: ["project"] });
	if (updatedBuild) {
		// log(`Update build status successfully >> ${app.slug} >> ${buildSlug} >> new status: ${buildStatus.toUpperCase()}`);
		return updatedBuild;
	} else {
		logError(`[START BUILD] updateBuildStatus >> error!`);
		return;
	}
}
