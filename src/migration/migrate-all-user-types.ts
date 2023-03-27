import { log } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";

import type { User } from "@/entities";

import { DB } from "../modules/api/DB";

export const migrateAllUserTypes = async () => {
	const users = await (await DB.find<User>("user", {})).filter((user) => user.type === undefined);
	if (isEmpty(users)) return;

	log(`[MIGRATION] migrateAllUserTypes() > Found ${users.length} users need migration.`);

	const results = (await Promise.all(users.map(async (user) => DB.update<User>("user", { _id: user._id }, { type: "user" }))))
		.filter((updatedItems) => updatedItems.length > 0)
		.map((updatedItems) => updatedItems[0]);

	log(`[MIGRATION] migrateAllUserTypes() > FINISH MIGRATION >> Affected ${results.length} users.`);

	return results;
};
