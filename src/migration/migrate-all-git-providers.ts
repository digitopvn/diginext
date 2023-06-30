import { log } from "diginext-utils/dist/xconsole/log";

import { DB } from "../modules/api/DB";

export const migrateAllGitProviders = async () => {
	const filter = [{ isOrg: null }, { isOrg: { $exists: false } }];
	const items = await DB.update("git", filter, { isOrg: true }, { select: ["_id"] });
	if (items.length > 0) log(`✓ [MIGRATION] migrateAllGitProviders > Affected ${items.length} git providers.`);
	return items;
};
