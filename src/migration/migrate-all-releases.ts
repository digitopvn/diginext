import { log } from "diginext-utils/dist/xconsole/log";

import { ReleaseService } from "@/services";

export const migrateAllReleases = async () => {
	const appSlug = "website-o",
		env = "prod";

	const releaseSvc = new ReleaseService();
	const releases = await releaseSvc.find({ appSlug, env, active: true }, { populate: ["app"], select: ["app", "_id", "diginext", "envVars"] });
	log(`[MIGRATION] migrateAllReleases > Found ${releases.length} releases need migration.`);
	const results = [];

	log(`[MIGRATION] migrateAllReleases > FINISH MIGRATION >> Affected ${results.length} releases.`);

	return results;
};
