import { logError } from "diginext-utils/dist/xconsole/log";

import type { AppDto, IApp, IProject } from "@/entities";
import type { ClientDeployEnvironmentConfig } from "@/interfaces";

import { getAppConfigFromApp } from "./app-helper";

export const updateAppConfig = async (app: IApp, env?: string, serverDeployEnvironment?: ClientDeployEnvironmentConfig) => {
	const { DB } = await import("../api/DB");

	let project: IProject = (app.project as any)._id ? (app.project as IProject) : await DB.findOne("project", { _id: app.project });
	if (!project) throw new Error(`Unable to update app config: Project ${app.project} not found.`);

	// ! IMPORTANT: In case app was moved to another project
	const updateAppData: AppDto = {
		slug: app.slug, // <-- update old app slug -> new app slug (if any)
		projectSlug: project.slug, // <-- update old app projectSlug -> new app projectSlug (if any)
		project: project._id, // <-- update old app's project -> new app's project (if any)
	};

	// update new app's deploy environment
	if (env && serverDeployEnvironment) {
		Object.keys(serverDeployEnvironment).map((key) => {
			updateAppData[`deployEnvironment.${env}.${key}`] = serverDeployEnvironment[key];
		});
	}

	// update to database
	const updatedApp = await DB.updateOne("app", { slug: app.slug }, updateAppData, { populate: ["owner", "workspace"] });

	if (!updatedApp) {
		logError(`App not found (probably deleted?)`);
		return;
	}

	// return app config
	const appConfig = getAppConfigFromApp(updatedApp);
	return appConfig;
};
