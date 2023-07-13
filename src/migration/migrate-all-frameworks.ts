import { log } from "diginext-utils/dist/xconsole/log";

export const migrateAllFrameworks = async () => {
	const { DB } = await import("@/modules/api/DB");
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
