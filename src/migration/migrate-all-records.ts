import { log } from "diginext-utils/dist/xconsole/log";

import { DB, dbCollections } from "../modules/api/DB";

export const migrateAllRecords = async () => {
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
