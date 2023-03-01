import { log } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";

import type { Framework } from "@/entities";
import { parseGitRepoDataFromRepoSSH } from "@/plugins";

import { DB } from "../modules/api/DB";

export const migrateAllFrameworks = async () => {
	const frameworks = (await DB.find<Framework>("framework")).filter(
		(fw) => typeof fw.isPrivate === "undefined" || typeof fw.gitProvider === "undefined"
	);

	if (isEmpty(frameworks)) return;

	log(`[MIGRATION] migrateAllFrameworks > Found ${frameworks.length} frameworks need migration.`);

	const results = (
		await Promise.all(
			frameworks.map(async (framework) => {
				// update the migration:
				const { gitProvider } = parseGitRepoDataFromRepoSSH(framework.repoSSH);
				return DB.update<Framework>("framework", { _id: framework._id }, { isPrivate: true, gitProvider });
			})
		)
	)
		.filter((updatedItems) => updatedItems.length > 0)
		.map((updatedItems) => updatedItems[0]);

	log(`[MIGRATION] migrateAllFrameworks > FINISH MIGRATION >> Affected ${results.length} frameworks.`);

	return results;
};
