import { isJSON } from "class-validator";
import { log } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

export const migrateAllReleases = async () => {
	const { DB } = await import("@/modules/api/DB");
	const releases = await DB.find("release", { appConfig: undefined }, { populate: ["app"], select: ["app", "_id", "diginext", "envVars"] });
	if (isEmpty(releases)) return;

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
			const updatedReleases = await DB.update("release", { _id: release._id }, { appConfig, envVars });
			return updatedReleases[0];
		})
		.filter((release) => typeof release !== "undefined");

	log(`[MIGRATION] migrateAllReleases > FINISH MIGRATION >> Affected ${results.length} releases.`);

	return results;
};
