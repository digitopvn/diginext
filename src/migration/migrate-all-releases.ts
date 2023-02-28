import { isJSON } from "class-validator";
import { log } from "diginext-utils/dist/console/log";

import type { Release } from "@/entities";

import { DB } from "../modules/api/DB";

export const migrateAllReleases = async () => {
	const releases = await DB.find<Release>("release", { appConfig: undefined }, { populate: ["app"] });
	log(`[MIGRATION] migrateAllReleases > Found ${releases.length} releases need migration.`);

	const results = releases
		.map(async (release) => {
			let appConfig;
			if (release.diginext && isJSON(release.diginext)) {
				appConfig = JSON.parse(release.diginext);
			}

			let envVars;
			if (release.envVars && isJSON(release.envVars)) {
				envVars = JSON.parse(release.envVars as unknown as string);
			}

			if (!appConfig && !envVars) return;

			// update the migration:
			const updatedReleases = await DB.update<Release>("release", { _id: release._id }, { appConfig, envVars });
			return updatedReleases[0];
		})
		.filter((release) => typeof release !== "undefined");

	log(`[MIGRATION] migrateAllReleases > FINISH MIGRATION >> Affected ${results.length} releases.`);

	return results;
};
