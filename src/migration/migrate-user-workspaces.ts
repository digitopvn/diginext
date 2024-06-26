import { log } from "diginext-utils/dist/xconsole/log";

import { isObjectId } from "@/plugins/mongodb";

export const migrateUserWorkspaces = async () => {
	const { DB } = await import("@/modules/api/DB");
	let users = await DB.find("user", { roles: undefined });

	users = users
		.map((user) => {
			const workspaces = (user.workspaces || []).filter((ws) => isObjectId(ws));

			if ((user.workspaces || []).length !== workspaces.length) {
				DB.update("user", { _id: user._id }, { workspaces });
				return user;
			}
		})
		.filter((user) => typeof user !== "undefined");

	log(`[MIGRATION] migrateUserWorkspaces() > FINISH MIGRATION >> Affected ${users.length} users.`);

	return users;
};
