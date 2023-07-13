import { log } from "diginext-utils/dist/xconsole/log";

export const migrateAllClusters = async () => {
	const { DB } = await import("@/modules/api/DB");
	const items = await DB.update(
		"cluster",
		{},
		[
			{
				$set: {
					// set "slug" = "shortName" (for existing clusters ONLY)
					slug: "$shortName",
					// set "migratedAt" field to avoid multiple migrations
					migratedAt: new Date(),
				},
			},
		],
		{
			raw: true,
			select: ["_id"],
		}
	);
	if (items.length > 0) log(`✓ [MIGRATION] migrateAllClusters > Affected ${items.length} clusters.`);
	return items;
};
