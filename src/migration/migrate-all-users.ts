import { log } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

import type { IUser } from "@/entities";

import { DB } from "../modules/api/DB";

export const migrateAllUsers = async () => {
	const users = await await DB.find<IUser>("user", { roles: undefined });
	if (isEmpty(users)) return;

	log(`[MIGRATION] migrateAllUserTypes() > Found ${users.length} users need to assign default roles.`);

	const results = await DB.update<IUser>("user", { type: undefined }, { type: "user" });

	log(`[MIGRATION] migrateAllUserTypes() > FINISH MIGRATION >> Affected ${results.length} users.`);

	return results;
};
