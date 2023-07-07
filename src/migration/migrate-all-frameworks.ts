import { log } from "diginext-utils/dist/xconsole/log";

import { DB } from "../modules/api/DB";

export const migrateAllFrameworks = async () => {
	const filter = { isPrivate: { $exists: true } };
	const items = await DB.update(
		"framework",
		filter,
		[
			// delete "isPrivate" field
			{ $unset: "isPrivate" },
			// set "migratedAt" field to avoid multiple migrations
			{ $set: { migratedAt: new Date() } },
		],
		{
			raw: true,
			select: ["_id"],
		}
	);
	if (items.length > 0) log(`✓ [MIGRATION] migrateAllGitProviders > Affected ${items.length} frameworks.`);
	return items;
};
