import type { ObjectId } from "mongodb";

import type { Workspace } from "@/entities";
import { Role } from "@/entities";
import { DB } from "@/modules/api/DB";

export const seedRoles = async (newWorkspace: Workspace, ownerId?: ObjectId) => {
	// member
	const memberRoleDto = new Role();
	memberRoleDto.name = "Member";
	memberRoleDto.routes = [
		{ route: "*", permissions: ["own", "read"] },
		{ route: "/api/v1/role", permissions: ["read"] },
		{ route: "/api/v1/api_key", permissions: ["read"] },
		{ route: "/api/v1/service_account", permissions: ["read"] },
	];
	memberRoleDto.workspace = newWorkspace._id;
	memberRoleDto.type = "member";

	const memberRole = await DB.create<Role>("role", memberRoleDto);
	if (memberRole) console.log(`Workspace "${newWorkspace.name}" > Created default member role :>> `, memberRoleDto.name);

	// admin
	const adminRoleDto = new Role();
	adminRoleDto.name = "Administrator";
	adminRoleDto.routes = [{ route: "*", permissions: ["full"] }];
	adminRoleDto.workspace = newWorkspace._id;
	adminRoleDto.type = "admin";

	const adminRole = await DB.create<Role>("role", adminRoleDto);
	if (adminRole) console.log(`Workspace "${newWorkspace.name}" > Created default admin role :>> `, adminRoleDto.name);

	// moderator
	const moderatorRoleDto = new Role();
	moderatorRoleDto.name = "Moderator";
	moderatorRoleDto.routes = [{ route: "*", permissions: ["read", "create", "update"] }];
	moderatorRoleDto.workspace = newWorkspace._id;
	moderatorRoleDto.type = "moderator";

	const moderatorRole = await DB.create<Role>("role", moderatorRoleDto);
	if (moderatorRole) console.log(`Workspace "${newWorkspace.name}" > Created default moderator role :>> `, moderatorRole.name);
};
