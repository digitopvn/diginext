// import { Role } from "@/entities";

import type { User, Workspace } from "@/entities";
import { Role } from "@/entities";
import { DB } from "@/modules/api/DB";

// seed default roles of a workspace
export const seedDefaultRoles = async (workspace: Workspace, owner: User) => {
	// ADMIN
	const adminRoleDto = new Role();
	adminRoleDto.name = "Administrator";
	adminRoleDto.routes = [{ route: "*", permissions: ["full"] }];
	adminRoleDto.workspace = workspace._id;
	adminRoleDto.type = "admin";

	const adminRole = await DB.create<Role>("role", adminRoleDto);
	if (adminRole) console.log(`Workspace "${workspace.name}" > Created default admin role :>> `, adminRoleDto.name);

	// assign admin role to the "owner" user
	const userRoles = owner.roles || [];
	userRoles.push(adminRole);
	const [user] = await DB.update<User>("user", { _id: owner._id }, { roles: userRoles });
	console.log(`Workspace "${workspace.name}" > User "${user.name}" is now an administrator.`);

	// MEMBER
	const memberRoleDto = new Role();
	memberRoleDto.name = "Member";
	memberRoleDto.routes = [
		{ route: "*", permissions: ["own", "read"] },
		{ route: "/api/v1/deploy", permissions: ["read", "create", "update"] },
		{ route: "/api/v1/domain", permissions: ["read", "create", "update"] },
		{ route: "/api/v1/project", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/app", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/app/environment", permissions: ["full"] },
		{ route: "/api/v1/app/environment/variables", permissions: ["full"] },
		{ route: "/api/v1/build/start", permissions: ["full"] },
		{ route: "/api/v1/build/stop", permissions: ["full"] },
		{ route: "/api/v1/user/join-workspace", permissions: ["update"] },
		{ route: "/api/v1/release", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/release/from-build", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/release/preview", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/role", permissions: ["read"] },
		{ route: "/api/v1/api_key", permissions: ["read"] },
		{ route: "/api/v1/service_account", permissions: ["read"] },
	];
	memberRoleDto.workspace = workspace._id;
	memberRoleDto.type = "member";

	const memberRole = await DB.create<Role>("role", memberRoleDto);
	if (memberRole) console.log(`Workspace "${workspace.name}" > Created default member role :>> `, memberRoleDto.name);

	// MODERATOR
	const moderatorRoleDto = new Role();
	moderatorRoleDto.name = "Moderator";
	moderatorRoleDto.routes = [{ route: "*", permissions: ["own", "read", "create", "update"] }];
	moderatorRoleDto.workspace = workspace._id;
	moderatorRoleDto.type = "moderator";

	const moderatorRole = await DB.create<Role>("role", moderatorRoleDto);
	if (moderatorRole) console.log(`Workspace "${workspace.name}" > Created default moderator role :>> `, moderatorRole.name);

	return [adminRole, memberRole, moderatorRole];
};
