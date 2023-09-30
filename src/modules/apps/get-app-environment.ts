import { isJSON } from "class-validator";

import type { IApp } from "@/entities";
import type { DeployEnvironment } from "@/interfaces";
// import { migrateDeployEnvironmentOfSpecificApps } from "@/migration/migrate-app-environment";

/**
 * Some old deploy environment was saved into JSON
 */
export const getDeployEnvironmentFromJSON = async (app: IApp, env: string) => {
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

export const getDeployEvironmentByApp = async (app: IApp, env: string) => {
	const deployEnvironment = ((app.deployEnvironment || {})[env] || {}) as DeployEnvironment;
	if (deployEnvironment.envVars) {
		deployEnvironment.envVars = deployEnvironment.envVars.map(({ name, value }) => {
			let valueStr: string;
			// try to cast {Object} to {string}
			try {
				valueStr = JSON.stringify(value);
			} catch (e: any) {}

			return { name, value: valueStr ?? value.toString() };
		});
	}
	return deployEnvironment;
};
