import { isJSON } from "class-validator";

import type { App } from "@/entities";
import type { DeployEnvironment } from "@/interfaces";

import { migrateDeployEnvironmentOfSpecificApps } from "./migrate-app-environment";

export const getAppEnvironmentFromJSON = async (app: App, env: string) => {
	let deployEnvironment = {} as DeployEnvironment;
	if (app.environment && app.environment[env]) {
		if (isJSON(app.environment[env])) {
			deployEnvironment = JSON.parse(app.environment[env] as string) as DeployEnvironment;
		} else {
			deployEnvironment = app.environment[env] as DeployEnvironment;
		}
	}
	return deployEnvironment;
};

export const getAppEvironment = async (app: App, env: string) => {
	let appEnvironment = app.deployEnvironment || {};
	if (!appEnvironment || !appEnvironment[env]) {
		appEnvironment[env] = await getAppEnvironmentFromJSON(app, env);

		// TODO: Remove this when everyone is using "deployEnvironment" !
		// migrate "environment" (JSON) to "deployEnvironment" (Object) as well:
		migrateDeployEnvironmentOfSpecificApps({ _id: app._id });
	}
	return appEnvironment[env];
};
