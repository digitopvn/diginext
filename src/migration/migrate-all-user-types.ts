import { log } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

export const migrateAllUserTypes = async () => {
	const { DB } = await import("@/modules/api/DB");

	const users = await (await DB.find("user", {}, { select: ["_id", "name", "type"] })).filter((user) => user.type === undefined);
	if (isEmpty(users)) return;

	log(`[MIGRATION] migrateAllUserTypes() > Found ${users.length} users need migration.`);

	const results = await DB.update("user", { type: undefined }, { type: "user" });

	log(`[MIGRATION] migrateAllUserTypes() > FINISH MIGRATION >> Affected ${results.length} users.`);

	return results;
};
