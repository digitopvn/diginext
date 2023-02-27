import { isJSON } from "class-validator";

import type { App } from "@/entities";

import { DB } from "../api/DB";

export const migrateDeployEnvironmentOfSpecificApps = async (filter: any = {}) => {
	const apps = await DB.find<App>("app", { ...filter, deployEnvironment: undefined });
	console.log(`migrateAppEnvironment > Found ${apps.length} apps need to migrate deploy environments.`);

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
	// console.log("updatedApps :>> ", updatedApps);

	const results = await Promise.all(
		updatedApps.map((app) => DB.update<App>("app", { _id: app._id }, { deployEnvironment: app.deployEnvironment }))
	);

	console.log(`migrateAppEnvironment > FINISH MIGRATION >> Affected ${results.length} items.`);

	return results;
};

export const migrateAllAppEnvironment = async () => {
	const apps = await DB.find<App>("app", { deployEnvironment: undefined });
	console.log(`migrateAppEnvironment > Found ${apps.length} apps need environment migration.`);

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
	// console.log("updatedApps :>> ", updatedApps);

	const results = await Promise.all(
		updatedApps.map((app) => DB.update<App>("app", { _id: app._id }, { deployEnvironment: app.deployEnvironment }))
	);

	console.log(`migrateAppEnvironment > FINISH MIGRATION >> Affected ${results.length} items.`);

	return results;
};
