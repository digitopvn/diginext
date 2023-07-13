import { log } from "diginext-utils/dist/xconsole/log";

export const migrateAllRecords = async () => {
	const { DB, dbCollections } = await import("@/modules/api/DB");
	const results = await Promise.all(
		dbCollections
			.filter((collection) => collection !== "workspace")
			.map((collection) => DB.update(collection, { public: { $exists: false } }, { public: true }, { select: ["_id"] }))
	);
	results.forEach((affectedItems, i) => {
		if (affectedItems.length > 0) log(`[MIGRATION] Add "public" field > ${dbCollections[i]} > affected ${affectedItems.length} items.`);
	});
	return results;
};
