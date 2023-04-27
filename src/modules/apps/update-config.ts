import { logError } from "diginext-utils/dist/console/log";

import type { IApp, IProject } from "@/entities";
import type { ClientDeployEnvironmentConfig } from "@/interfaces";

import { DB } from "../api/DB";
import { getAppConfigFromApp } from "./app-helper";

export const updateAppConfig = async (app: IApp, env: string, serverDeployEnvironment: ClientDeployEnvironmentConfig) => {
	let project: IProject = app.project as IProject;
	const updateAppData = {
		slug: app.slug, // <-- update old app slug -> new app slug (if any)
		projectSlug: project.slug, // <-- update old app projectSlug -> new app projectSlug (if any)
		project: project._id, // <-- update old app's project -> new app's project (if any)
		deployEnvironment: {
			[env]: serverDeployEnvironment, // <-- update new app's deploy environment
		},
	};

	const updatedApp = await DB.updateOne<IApp>("app", { slug: app.slug }, updateAppData);

	if (!updatedApp) {
		logError(`App not found (probably deleted?)`);
		return;
	}

	const appConfig = getAppConfigFromApp(updatedApp);
	return appConfig;
};
