import { isJSON } from "class-validator";
import { log } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";

import type { App } from "@/entities";

import { DB } from "../modules/api/DB";
import { fetchDeploymentFromContent } from "../modules/deploy";

export const migrateDeployEnvironmentOfSpecificApps = async (filter: any = {}) => {
	const apps = await DB.find<App>("app", { ...filter, deployEnvironment: undefined });
	if (isEmpty(apps)) return;

	log(`[MIGRATION] migrateAppEnvironment > Found ${apps.length} apps need to migrate deploy environments.`);

	const updatedApps = apps.map((app) => {
		const updatedApp = app;
		const previousEnvironment = app.environment || {};
		updatedApp.deployEnvironment = {};

		Object.entries(previousEnvironment).forEach(([env, environmentJson]) => {
			const curEnvironment = isJSON(environmentJson) ? JSON.parse(environmentJson as string) : {};
			updatedApp.deployEnvironment[env] = curEnvironment;
		});

		return updatedApp;
	});

	const results = await Promise.all(
		updatedApps.map((app) => DB.update<App>("app", { _id: app._id }, { deployEnvironment: app.deployEnvironment }))
	);

	log(`[MIGRATION] migrateAppEnvironment > FINISH MIGRATION >> Affected ${results.length} apps.`);

	return results;
};

export const migrateAllAppEnvironment = async () => {
	const apps = await DB.find<App>("app", { deployEnvironment: undefined });
	if (isEmpty(apps)) return;

	log(`[MIGRATION] migrateAppEnvironment > Found ${apps.length} apps need environment migration.`);

	const updatedApps = apps.map((app) => {
		const updatedApp = app;
		const previousEnvironment = app.environment || {};
		updatedApp.deployEnvironment = {};

		Object.entries(previousEnvironment).forEach(([env, environmentJson]) => {
			const curEnvironment = isJSON(environmentJson) ? JSON.parse(environmentJson as string) : {};

			// parse ENV variables from YAML:
			if (curEnvironment[env]?.deploymentYaml) {
				const { ENV_VARS } = fetchDeploymentFromContent(curEnvironment[env].deploymentYaml);
				curEnvironment.envVars = ENV_VARS;
			}

			updatedApp.deployEnvironment[env] = curEnvironment;
		});

		return updatedApp;
	});

	const results = await Promise.all(
		updatedApps.map((app) => DB.update<App>("app", { _id: app._id }, { deployEnvironment: app.deployEnvironment }))
	);

	log(`[MIGRATION] migrateAppEnvironment > FINISH MIGRATION >> Affected ${results.length} items.`);

	return results;
};
