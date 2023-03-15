import { log, logError } from "diginext-utils/dist/console/log";

import type { App, Build, Project } from "@/entities";
import type { BuildStatus } from "@/interfaces/SystemTypes";

import { DB } from "../api/DB";

export async function updateBuildStatus(build: Build, status: BuildStatus) {
	if (!build) {
		logError(`[START BUILD] updateBuildStatus > "build" is required.`);
		return;
	}

	const appId = (build.app as any)?._id ? (build.app as any)._id : build.app;
	log(`[START BUILD] updateBuildStatus > appId :>>`, appId);

	const [updatedBuild] = await DB.update<Build>("build", { _id: build._id }, { status }, { populate: ["project"] });
	if (!updatedBuild) {
		logError(`[START BUILD] updateBuildStatus >> error!`);
		return;
	}

	// update latest build to current app
	const [updatedApp] = await DB.update<App>("app", { _id: appId }, { latestBuild: build.slug });
	log(`[START BUILD] updateBuildStatus > updatedApp :>>`, updatedApp.latestBuild);

	const [updatedProject] = await DB.update<Project>("project", { _id: updatedApp.project }, { latestBuild: build.slug });
	log(`[START BUILD] updateBuildStatus > updatedProject :>>`, updatedProject.latestBuild);

	return updatedBuild;
}

export async function updateBuildStatusByAppSlug(appSlug: string, buildSlug: string, buildStatus: BuildStatus) {
	// find the existing project
	if (!appSlug) {
		logError(`[START BUILD] updateBuildStatus > "appSlug" is required.`);
		return;
	}

	const app = await DB.findOne<App>("app", { slug: appSlug }, { populate: ["project"] });
	log(`[START BUILD] updateBuildStatus > app :>>`, app);

	// update latest build to current project
	let projectSlug = (app.project as Project).slug;
	log(`[START BUILD] updateBuildStatus > projectSlug :>>`, projectSlug);

	const [updatedProject] = await DB.update<Project>("project", { slug: projectSlug }, { latestBuild: buildSlug });
	log(`[START BUILD] updateBuildStatus > updatedProject :>>`, updatedProject.latestBuild);

	// update latest build to current app
	const [updatedApp] = await DB.update<App>("app", { slug: appSlug }, { latestBuild: buildSlug });
	log(`[START BUILD] updateBuildStatus > updatedApp :>>`, updatedApp.latestBuild);

	// update build's status on server
	const [updatedBuild] = await DB.update<Build>("build", { slug: buildSlug }, { status: buildStatus }, { populate: ["project"] });
	if (updatedBuild) {
		// log(`Update build status successfully >> ${app.slug} >> ${buildSlug} >> new status: ${buildStatus.toUpperCase()}`);
		return updatedBuild;
	} else {
		logError(`[START BUILD] updateBuildStatus >> error!`);
		return;
	}
}
