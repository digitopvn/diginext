import { log, logError } from "diginext-utils/dist/console/log";

import type { App, Build, Project } from "@/entities";
import { BuildService } from "@/services";

import { DB } from "../api/DB";

export async function updateBuildStatus(appSlug: string, buildSlug: string, buildStatus: "start" | "building" | "failed" | "success") {
	const buildSvc = new BuildService();

	// find the existing project
	if (!appSlug) {
		logError(`updateBuildStatus > "appSlug" is required.`);
		return;
	}

	const app = await DB.findOne<App>("app", { slug: appSlug }, { populate: ["project"] });

	// update latest build to current project
	let projectSlug = (app.project as Project).slug;
	const updatedProjects = await DB.update<Project>("project", { slug: projectSlug }, { latestBuild: buildSlug });
	const updatedProject = updatedProjects[0];

	log(`updateBuildStatus >`, { updatedProject });

	// update latest build to current app
	await DB.update<App>("app", { slug: appSlug }, { latestBuild: buildSlug });

	// update build's status on server
	const updatedBuilds = await DB.update<Build>("build", { slug: buildSlug }, { status: buildStatus }, { populate: ["project"] });
	let updatedBuild = updatedBuilds[0];

	if (updatedBuild) {
		log(`Update build status successfully >> ${app.slug} >> ${buildSlug} >> new status: ${buildStatus.toUpperCase()}`);
		return updatedBuild;
	} else {
		logError(`updateBuildStatus >> error!`);
		return { error: "Something is wrong..." };
	}
}
