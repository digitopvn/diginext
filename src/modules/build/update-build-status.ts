import dayjs from "dayjs";
import { log, logError } from "diginext-utils/dist/console/log";

import type { IApp, IBuild, IProject } from "@/entities";
import type { BuildStatus } from "@/interfaces/SystemTypes";

import { DB } from "../api/DB";

export async function updateBuildStatus(build: IBuild, status: BuildStatus) {
	if (!build) {
		logError(`[START BUILD] updateBuildStatus > "build" is required.`);
		return;
	}

	const appId = (build.app as any)?._id ? (build.app as any)._id : build.app;
	log(`[START BUILD] updateBuildStatus > appId :>>`, appId);

	const startTime = build.startTime ? dayjs(build.startTime) : undefined;
	const endTime = status === "failed" || status === "success" ? new Date() : undefined;
	const duration = endTime ? dayjs(endTime).diff(startTime, "millisecond") : undefined;

	const [updatedBuild] = await DB.update<IBuild>("build", { _id: build._id }, { status, endTime, duration }, { populate: ["project"] });
	if (!updatedBuild) {
		logError(`[START BUILD] updateBuildStatus >> error!`);
		return;
	}

	// update latest build to current app
	const [updatedApp] = await DB.update<IApp>("app", { _id: appId }, { latestBuild: build.slug });
	log(`[START BUILD] updateBuildStatus > updatedApp :>>`, updatedApp.latestBuild);

	const [updatedProject] = await DB.update<IProject>("project", { _id: updatedApp.project }, { latestBuild: build.slug });
	log(`[START BUILD] updateBuildStatus > updatedProject :>>`, updatedProject.latestBuild);

	return updatedBuild;
}

export async function updateBuildStatusByAppSlug(appSlug: string, buildSlug: string, buildStatus: BuildStatus) {
	// find the existing project
	if (!appSlug) {
		logError(`[START BUILD] updateBuildStatus > "appSlug" is required.`);
		return;
	}

	const app = await DB.findOne<IApp>("app", { slug: appSlug }, { populate: ["project"] });

	// update latest build to current project
	let projectSlug = (app.project as IProject).slug;
	// log(`[START BUILD] updateBuildStatus > projectSlug :>>`, projectSlug);

	const [updatedProject] = await DB.update<IProject>("project", { slug: projectSlug }, { latestBuild: buildSlug });
	// log(`[START BUILD] updateBuildStatus > updatedProject :>>`, updatedProject.latestBuild);

	// update latest build to current app
	const [updatedApp] = await DB.update<IApp>("app", { slug: appSlug }, { latestBuild: buildSlug });
	// log(`[START BUILD] updateBuildStatus > updatedApp :>>`, updatedApp.latestBuild);

	// update build's status on server
	const [updatedBuild] = await DB.update<IBuild>("build", { slug: buildSlug }, { status: buildStatus }, { populate: ["project"] });
	if (updatedBuild) {
		// log(`Update build status successfully >> ${app.slug} >> ${buildSlug} >> new status: ${buildStatus.toUpperCase()}`);
		return updatedBuild;
	} else {
		logError(`[START BUILD] updateBuildStatus >> error!`);
		return;
	}
}
