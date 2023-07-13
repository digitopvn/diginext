import { logError } from "diginext-utils/dist/xconsole/log";

import type { AppDto, IApp, IProject } from "@/entities";
import type { ClientDeployEnvironmentConfig } from "@/interfaces";

import { getAppConfigFromApp } from "./app-helper";

export const updateAppConfig = async (app: IApp, env?: string, serverDeployEnvironment?: ClientDeployEnvironmentConfig) => {
	const { DB } = await import("../api/DB");

	let project: IProject = app.project as IProject;

	const updateAppData: AppDto = {
		slug: app.slug, // <-- update old app slug -> new app slug (if any)
		projectSlug: project.slug, // <-- update old app projectSlug -> new app projectSlug (if any)
		project: project._id, // <-- update old app's project -> new app's project (if any)
	};

	if (env && serverDeployEnvironment) {
		// update new app's deploy environment
		// updateAppData.deployEnvironment = {};
		// updateAppData.deployEnvironment[env] = serverDeployEnvironment;
		Object.keys(serverDeployEnvironment).map((key) => {
			updateAppData[`deployEnvironment.${env}.${key}`] = serverDeployEnvironment[key];
		});
	}

	const updatedApp = await DB.updateOne("app", { slug: app.slug }, updateAppData);

	if (!updatedApp) {
		logError(`App not found (probably deleted?)`);
		return;
	}

	const appConfig = getAppConfigFromApp(updatedApp);
	return appConfig;
};
