import { isJSON } from "class-validator";
import { log } from "diginext-utils/dist/console/log";
import { isEmpty, isObject } from "lodash";

import type { App } from "@/entities";

import { DB } from "../modules/api/DB";

export const migrateDeployEnvironmentOfSpecificApps = async (filter: any = {}) => {
	const apps = await DB.find<App>("app", { ...filter, deployEnvironment: undefined });
	if (isEmpty(apps)) return;

	// log(`[MIGRATION] migrateAppEnvironment > Found ${apps.length} apps need to migrate deploy environments.`);

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

	log(`[MIGRATION] ✓ migrateAppEnvironment > FINISH >> Affected ${results.length} apps.`);

	return results;
};

export const migrateAppEnvironmentVariables = async (app: App) => {
	if (isEmpty(app)) return;
	if (isEmpty(app.deployEnvironment)) return;

	const updateData = {} as any;
	Object.entries(app.deployEnvironment).map(([env, deployData]) => {
		if (deployData && deployData.envVars && isObject(deployData.envVars)) {
			/**
			 * - {Object} envVars
			 * @example
			 * {
			 * 	"0": { name: "NAME", value: "VALUE" },
			 * 	"1": { name: "NAME", value: "VALUE" },
			 * 	...
			 * }
			 *
			 * - {Array} envVars
			 * @example
			 * [
			 * 	{ name: "NAME", value: "VALUE" },
			 * 	{ name: "NAME", value: "VALUE" },
			 * 	...
			 * ]
			 */
			const newEnvVars = Object.values(deployData.envVars);
			updateData[`deployEnvironment.${env}.envVars`] = newEnvVars;
		}
	});

	if (isEmpty(updateData)) return;

	const [updatedApp] = await DB.update<App>("app", { _id: app._id }, updateData);
	if (!updatedApp) return;

	return updatedApp;
};

export const migrateAllAppEnvironment = async () => {
	const apps = await DB.find<App>("app", { deployEnvironment: undefined });
	if (isEmpty(apps)) return;

	// log(`[MIGRATION] migrateAppEnvironment > Found ${apps.length} apps need environment migration.`);

	// convert "envVars" {Object} to {Array} (if needed)
	const results = (await Promise.all(apps.map((app) => migrateAppEnvironmentVariables(app)))).filter((app) => typeof app !== "undefined");

	if (results.length > 0) log(`[MIGRATION] ✓ migrateAppEnvironment > FINISH >> Affected ${results.length} items.`);

	return results;
};
