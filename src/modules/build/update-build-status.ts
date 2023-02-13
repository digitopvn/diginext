import { log } from "diginext-utils/dist/console/log";

import { isServerMode } from "@/app.config";
import type { App, Build, Project } from "@/entities";
import { logError } from "@/plugins";
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

	// log(`updateBuildStatus >`, { app });

	// update latest build to current project
	let projectSlug = (app.project as Project).slug;
	if (isServerMode) {
		const projectSvc = new ProjectService();
		await projectSvc.update({ slug: projectSlug }, { latestBuild: buildSlug });
	} else {
		await fetchApi<Project>({
			url: "/api/v1/project?slug=" + projectSlug,
			method: "PATCH",
			data: { latestBuild: buildSlug },
		});
	}
	// log(`updateBuildStatus >`, { project });

	// update latest build to current app
	if (isServerMode) {
		await appSvc.update({ slug: appSlug }, { latestBuild: buildSlug });
	} else {
		await fetchApi<App>({
			url: "/api/v1/app?slug=" + appSlug,
			method: "PATCH",
			data: { latestBuild: buildSlug },
		});
	}
	// log(`updateBuildStatus >`, { updatedApp });

	// update build's status on Digirelease
	let updatedBuild;
	if (isServerMode) {
		updatedBuild = await buildSvc.update({ slug: buildSlug }, { status: buildStatus });
	} else {
		const res = await fetchApi<Build>({
			url: "/api/v1/build?slug=" + buildSlug,
			method: "PATCH",
			data: { status: buildStatus },
		});
		updatedBuild = res.data;
	}
	// log(`updateBuildStatus >> res:`, res);

	if (updatedBuild && updatedBuild.length > 0) {
		log(`Update build status successfully >> ${app.slug} >> ${buildSlug} >> ${buildStatus}`);
		return updatedBuild[0] ?? updatedBuild;
	} else {
		logError(`updateBuildStatus >> error!`);
		return { error: "Something is wrong..." };
	}
}
