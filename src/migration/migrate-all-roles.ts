import { log } from "diginext-utils/dist/xconsole/log";

import type { RoleRoute } from "@/entities";
import { adminRoleRoutes, memberRoleRoutes, moderatorRoleRoutes } from "@/interfaces/SystemTypes";
import { MongoDB } from "@/plugins/mongodb";

const toRouteStr = (route: RoleRoute) => `${route.path}-${(route.scope || []).sort().join(",")}-${route.permissions.sort().join(",")}`;
const toAllRoutesStr = (routes: RoleRoute[]) =>
	routes
		.map((route) => toRouteStr(route))
		.sort()
		.join("|");

export const migrateAllRoles = async () => {
	const { DB } = await import("@/modules/api/DB");
	let roles = await await DB.find(
		"role",
		{ type: { $in: ["admin", "moderator", "member"] } },
		{ select: ["_id", "routes", "maskedFields", "type"] }
	);

	// find migration conditions
	const affectedAdministratorIds: string[] = [];
	const affectedModeratorIds: string[] = [];
	const affectedMemberIds: string[] = [];

	roles = roles.map((role) => {
		// remove "_id" field of routes
		if (role.routes) {
			role.routes = role.routes.map((route) => {
				delete (route as any)._id;
				return route;
			});
		}
		return role;
	});

	roles.forEach((role) => {
		if (role.type === "admin" && role.routes && toAllRoutesStr(role.routes) !== toAllRoutesStr(adminRoleRoutes)) {
			// console.log(`[ROLE] ${role.type} > toAllRoutesStr(role.routes) :>> `, toAllRoutesStr(role.routes));
			// console.log(`[ROLE] ${role.type} > toAllRoutesStr(moderatorRoleRoutes) :>> `, toAllRoutesStr(moderatorRoleRoutes));
			// console.log(`[ROLE] ${role.type} > role.routes :>> `, role.routes);
			affectedAdministratorIds.push(MongoDB.toString(role._id));
		}
		if (role.type === "moderator" && role.routes && toAllRoutesStr(role.routes) !== toAllRoutesStr(moderatorRoleRoutes)) {
			// console.log(`[ROLE] ${role.type} > toAllRoutesStr(role.routes) :>> `, toAllRoutesStr(role.routes));
			// console.log(`[ROLE] ${role.type} > toAllRoutesStr(moderatorRoleRoutes) :>> `, toAllRoutesStr(moderatorRoleRoutes));
			// console.log(`[ROLE] ${role.type} > role.routes :>> `, role.routes);
			affectedModeratorIds.push(MongoDB.toString(role._id));
		}
		if (role.type === "member" && role.routes && toAllRoutesStr(role.routes) !== toAllRoutesStr(memberRoleRoutes)) {
			// console.log(`[ROLE] ${role.type} > role.routes :>> `, role.routes);
			affectedMemberIds.push(MongoDB.toString(role._id));
			// console.log(`[ROLE] ${role.type} > toAllRoutesStr(role.routes) :>> `, toAllRoutesStr(role.routes));
			// console.log(`[ROLE] ${role.type} > toAllRoutesStr(moderatorRoleRoutes) :>> `, toAllRoutesStr(moderatorRoleRoutes));
		}
	});

	// skip if no need migration...
	if (affectedAdministratorIds.length === 0 && affectedModeratorIds.length === 0 && affectedMemberIds.length === 0) return;

	// start migrating...
	const roleTypes = ["moderator", "member"];
	const results = await Promise.all([
		DB.update("role", { _id: { $in: affectedAdministratorIds } }, { routes: adminRoleRoutes }),
		DB.update("role", { _id: { $in: affectedModeratorIds } }, { routes: moderatorRoleRoutes }),
		DB.update("role", { _id: { $in: affectedMemberIds } }, { routes: memberRoleRoutes }),
	]);

	// notify migration results...
	results.forEach((affects, i) => {
		if (affects.length > 0 && roleTypes[i])
			log(`[MIGRATION] migrateAllRoles() > ${roleTypes[i].toUpperCase()} >> Affected ${affects.length} items.`);
	});

	return results;
};
