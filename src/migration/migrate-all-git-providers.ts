import { log } from "diginext-utils/dist/xconsole/log";

import { DB } from "../modules/api/DB";

export const migrateAllGitProviders = async () => {
	const filter = { $or: [{ isOrg: null }, { isOrg: { $exists: false } }] };
	const items = await DB.find("git", filter, { select: ["_id", "public"] });
	if (items.length === 0) return;

	// update "isOrg" -> "public"
	await Promise.all(items.map((item) => DB.updateOne("git", { _id: item._id }, { isOrg: item.public })));

	log(`✓ [MIGRATION] migrateAllGitProviders > Affected ${items.length} git providers.`);
	return items;
};
