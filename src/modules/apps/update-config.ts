import { logError } from "diginext-utils/dist/xconsole/log";

import type { AppDto, IApp, IProject } from "@/entities";
import type { ClientDeployEnvironmentConfig } from "@/interfaces";
import { MongoDB } from "@/plugins/mongodb";

import { getAppConfigFromApp } from "./app-helper";

export const updateAppConfig = async (
	app: IApp,
	env?: string,
	serverDeployEnvironment?: ClientDeployEnvironmentConfig,
	options?: { isDebugging?: boolean }
) => {
	if (!options) options = {};

	const { DB } = await import("../api/DB");
	if (options?.isDebugging) console.log("updateAppConfig() > app.project :>> ", app.project);
	if (options?.isDebugging) console.log("updateAppConfig() > isValidObjectId(app.project) :>> ", MongoDB.isValidObjectId(app.project));

	let project: IProject;
	if (MongoDB.isValidObjectId(app.project)) {
		project = await DB.findOne("project", { _id: app.project }, { isDebugging: options.isDebugging });
		if (options?.isDebugging) console.log("updateAppConfig() > project :>> ", project);
	} else if ((app.project as any)._id) {
		project = app.project as IProject;
	}

	if (options?.isDebugging) console.log("updateAppConfig() > project :>> ", project);
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
	const updatedApp = await DB.updateOne("app", { slug: app.slug }, updateAppData, {
		populate: ["owner", "workspace"],
		isDebugging: true,
	});

	if (!updatedApp) {
		logError(`App not found (probably deleted?)`);
		return;
	}

	// return app config
	const appConfig = getAppConfigFromApp(updatedApp);
	return appConfig;
};
