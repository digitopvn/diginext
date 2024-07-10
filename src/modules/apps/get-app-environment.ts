import { isJSON } from "class-validator";

import type { IApp } from "@/entities";
import type { DeployEnvironment } from "@/interfaces";
import { formatEnvVars } from "@/plugins/env-var";
// import { migrateDeployEnvironmentOfSpecificApps } from "@/migration/migrate-app-environment";

/**
 * Some old deploy environment was saved into JSON
 */
export const getDeployEnvironmentFromJSON = (app: IApp, env: string) => {
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

export const getDeployEvironmentByApp = (app: IApp, env: string) => {
	const deployEnvironment = ((app.deployEnvironment || {})[env] || {}) as DeployEnvironment;

	// format environment variables
	if (deployEnvironment.envVars) deployEnvironment.envVars = formatEnvVars(deployEnvironment.envVars);

	return deployEnvironment;
};
