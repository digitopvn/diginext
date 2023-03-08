import { isJSON } from "class-validator";

import type { App } from "@/entities";
import type { DeployEnvironment } from "@/interfaces";
// import { migrateDeployEnvironmentOfSpecificApps } from "@/migration/migrate-app-environment";

/**
 * Some old deploy environment was saved into JSON
 */
export const getDeployEnvironmentFromJSON = async (app: App, env: string) => {
	let deployEnvironment = {} as DeployEnvironment;
	if (app.environment && app.environment[env]) {
		if (isJSON(app.environment[env])) {
			deployEnvironment = JSON.parse(app.environment[env] as string) as DeployEnvironment;
		} else {
			deployEnvironment = app.environment[env] as DeployEnvironment;
		}
	}
	return deployEnvironment || {};
};

export const getDeployEvironmentByApp = async (app: App, env: string) => {
	// let deployEnvironment = app.deployEnvironment || {};
	// if (isEmpty(deployEnvironment) || isEmpty(deployEnvironment[env])) {
	// 	// try to fetch from old CLI version if any...
	// 	deployEnvironment[env] = await getDeployEnvironmentFromJSON(app, env);
	// 	// migrateDeployEnvironmentOfSpecificApps({ _id: app._id });
	// }
	return (app.deployEnvironment || {})[env] || {};
};
