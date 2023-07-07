import { log } from "diginext-utils/dist/xconsole/log";

import { filterUniqueItemWithCondition } from "@/plugins/array";

import { DB } from "../modules/api/DB";

export const migrateAllUsers = async () => {
	const users = await await DB.find(
		"user",
		// { $or: [{ migratedAt: { $exists: false } }, { migratedAt: { $gte: dayjs().startOf("date"), $lte: dayjs().endOf("date") } }] },
		{ migratedAt: { $exists: false } },
		{ populate: ["roles"], select: ["_id", "roles"] }
	);
	if (users.length === 0) return;

	const results = await Promise.all(
		users
			.filter((user) => {
				const fixedRoles = filterUniqueItemWithCondition(user.roles, "workspace", { field: "type", value: "admin" });
				user.roles = fixedRoles.map((role) => role._id);
				return user;
			})
			.map((user) => DB.updateOne("user", { _id: user._id }, { roles: user.roles, migratedAt: new Date() }, { select: ["_id"] }))
	);

	log(`[MIGRATION] migrateAllUsers() > Affected ${results.length} users.`);

	return results;
};
