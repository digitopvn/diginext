import { log } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";

import type { User } from "@/entities";

import { DB } from "../modules/api/DB";

export const migrateAllUsers = async () => {
	const users = await await DB.find<User>("user", { roles: undefined });
	if (isEmpty(users)) return;

	log(`[MIGRATION] migrateAllUserTypes() > Found ${users.length} users need to assign default roles.`);

	const results = await DB.update<User>("user", { type: undefined }, { type: "user" });

	log(`[MIGRATION] migrateAllUserTypes() > FINISH MIGRATION >> Affected ${results.length} users.`);

	return results;
};
