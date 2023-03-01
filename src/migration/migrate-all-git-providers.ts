import { log } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";

import type { GitProvider } from "@/entities";

import { DB } from "../modules/api/DB";

export const migrateAllGitProviders = async () => {
	const providers = (await DB.find<GitProvider>("git")).filter((provider) => typeof provider.type === "undefined");

	if (isEmpty(providers)) return;

	log(`[MIGRATION] migrateAllGitProviders > Found ${providers.length} git providers need migration.`);

	const results = (
		await Promise.all(
			providers.map(async (provider) => DB.update<GitProvider>("git", { _id: provider._id }, { type: provider.host.split(".")[0] as any }))
		)
	)
		.filter((updatedItems) => updatedItems.length > 0)
		.map((updatedItems) => updatedItems[0]);

	log(`[MIGRATION] migrateAllGitProviders > FINISH MIGRATION >> Affected ${results.length} git providers.`);

	return results;
};
