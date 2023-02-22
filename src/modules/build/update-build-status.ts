import { log, logError } from "diginext-utils/dist/console/log";

import { isServerMode } from "@/app.config";
import type { App, Build, Project } from "@/entities";
import { AppService, BuildService, ProjectService } from "@/services";

import { fetchApi } from "../api";

export async function updateBuildStatus(appSlug: string, buildSlug: string, buildStatus: "start" | "building" | "failed" | "success") {
	const buildSvc = new BuildService();

	// find the existing project
	if (!appSlug) {
		logError(`updateBuildStatus > "appSlug" is required.`);
		return;
	}

	let app, appSvc: AppService;
	if (isServerMode) {
		appSvc = new AppService();
		app = await appSvc.findOne({ slug: appSlug }, { populate: ["project"] });
	} else {
		const { data: apps } = await fetchApi<App>({ url: `/api/v1/app?slug=${appSlug}&populate=project` });
		app = apps[0];
	}

	// update latest build to current project
	let projectSlug = (app.project as Project).slug;
	let updatedProject;
	if (isServerMode) {
		const projectSvc = new ProjectService();
		const projects = await projectSvc.update({ slug: projectSlug }, { latestBuild: buildSlug });
		if (projects.length > 0) updatedProject = projects[0];
	} else {
		const { data: projects } = await fetchApi<Project>({
			url: "/api/v1/project?slug=" + projectSlug,
			method: "PATCH",
			data: { latestBuild: buildSlug },
		});
		if ((projects as Project[]).length > 0) updatedProject = projects[0];
	}
	log(`updateBuildStatus >`, { updatedProject });

	// update latest build to current app
	if (isServerMode) {
		await appSvc.update({ slug: appSlug }, { latestBuild: buildSlug }, { populate: ["project"] });
	} else {
		await fetchApi<App>({
			url: `/api/v1/app?slug=${appSlug}&populate=project`,
			method: "PATCH",
			data: { latestBuild: buildSlug },
		});
	}

	// update build's status on server
	let updatedBuild: Build[];
	if (isServerMode) {
		updatedBuild = await buildSvc.update({ slug: buildSlug }, { status: buildStatus }, { populate: ["project"] });
	} else {
		const res = await fetchApi<Build>({
			url: `/api/v1/build?slug=${buildSlug}&populate=project`,
			method: "PATCH",
			data: { status: buildStatus },
		});
		updatedBuild = res.data as Build[];
	}

	if (updatedBuild && updatedBuild.length > 0) {
		log(`Update build status successfully >> ${app.slug} >> ${buildSlug} >> new status: ${buildStatus.toUpperCase()}`);
		return updatedBuild[0];
	} else {
		logError(`updateBuildStatus >> error!`);
		return { error: "Something is wrong..." };
	}
}
