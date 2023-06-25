import { log } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

import type { IFramework } from "@/entities";
import { parseGitRepoDataFromRepoSSH } from "@/plugins";

import { DB } from "../modules/api/DB";

export const migrateAllFrameworks = async () => {
	const frameworks = (await DB.find<IFramework>("framework")).filter(
		(fw) => typeof fw.isPrivate === "undefined" || typeof fw.gitProvider === "undefined"
	);

	if (isEmpty(frameworks)) return;

	log(`[MIGRATION] migrateAllFrameworks > Found ${frameworks.length} frameworks need migration.`);

	const results = (
		await Promise.all(
			frameworks.map(async (framework) => {
				// update the migration:
				console.log("framework :>> ", framework);
				console.log("framework.repoSSH :>> ", framework.repoSSH);
				const { gitProvider } = parseGitRepoDataFromRepoSSH(framework.repoSSH);
				return DB.update<IFramework>("framework", { _id: framework._id }, { isPrivate: true, gitProvider });
			})
		)
	)
		.filter((updatedItems) => updatedItems.length > 0)
		.map((updatedItems) => updatedItems[0]);

	log(`[MIGRATION] migrateAllFrameworks > FINISH MIGRATION >> Affected ${results.length} frameworks.`);

	return results;
};