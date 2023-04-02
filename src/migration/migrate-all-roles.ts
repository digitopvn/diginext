import { ObjectId } from "mongodb";

import type { User, Workspace } from "@/entities";
import { Role } from "@/entities";
import type ApiKeyAccount from "@/entities/ApiKeyAccount";
import type ServiceAccount from "@/entities/ServiceAccount";
import { DB } from "@/modules/api/DB";

export const migrateAllRoles = async () => {
	const workspaces = (await DB.find<Workspace>("workspace", {})) || [];

	// create default roles for each workspace: Admin, Moderator & Member
	for (const ws of workspaces) {
		const wsId = new ObjectId(ws._id.toString());
		// Member
		let memberRole: Role;
		const wsMemberRole = await DB.findOne<Role>("role", { type: "member", workspace: wsId });
		if (!wsMemberRole) {
			const memberRoleDto = new Role();
			memberRoleDto.name = "Member";
			memberRoleDto.routes = [
				{ route: "*", permissions: ["own", "read"] },
				{ route: "/api/v1/role", permissions: ["read"] },
				{ route: "/api/v1/api_key", permissions: ["read"] },
				{ route: "/api/v1/service_account", permissions: ["read"] },
			];
			memberRoleDto.workspace = wsId;
			memberRoleDto.type = "member";

			memberRole = await DB.create<Role>("role", memberRoleDto);
			if (memberRole) console.log(`Workspace "${ws.name}" > Created default member role :>> `, memberRoleDto.name);
		} else {
			memberRole = wsMemberRole;
		}

		// find other members of the workspace and assign "Member" role
		let members = await DB.find<User>("user", { workspaces: ws._id, roles: memberRole._id });
		// if (!members || members.length === 0) {
		members = await DB.update<User>("user", { workspaces: ws._id }, { roles: [memberRole._id] });
		console.log(`Workspace "${ws.name}" > Assign "Member" role to ${members.length} members`);
		// }

		// Admin
		let adminRole: Role;
		const wsAdminRole = await DB.findOne<Role>("role", { type: "admin", workspace: ws._id });

		if (!wsAdminRole) {
			const adminRoleDto = new Role();
			adminRoleDto.name = "Administrator";
			adminRoleDto.routes = [{ route: "*", permissions: ["full"] }];
			adminRoleDto.workspace = ws._id;
			adminRoleDto.type = "admin";

			adminRole = await DB.create<Role>("role", adminRoleDto);
			if (adminRole) console.log(`Workspace "${ws.name}" > Created default admin role :>> `, adminRoleDto.name);
		} else {
			adminRole = wsAdminRole;
		}

		// find owner of the workspace and assign "Administrator" role
		let owner = await DB.findOne<User>("user", { _id: ws.owner, roles: wsAdminRole._id });
		// if (!owner) {
		[owner] = await DB.update<User>("user", { _id: ws.owner }, { roles: [wsAdminRole._id] });
		console.log(`Workspace "${ws.name}" > Assign "Administrator" role to "${owner.name}"`);
		// }

		// Moderator
		let moderatorRole: Role;
		const wsModeratorRole = await DB.findOne<Role>("role", { type: "moderator", workspace: ws._id });
		if (!wsModeratorRole) {
			const moderatorRoleDto = new Role();
			moderatorRoleDto.name = "Moderator";
			moderatorRoleDto.routes = [{ route: "*", permissions: ["read", "create", "update"] }];
			moderatorRoleDto.workspace = ws._id;
			moderatorRoleDto.type = "moderator";

			moderatorRole = await DB.create<Role>("role", moderatorRoleDto);
			if (moderatorRole) console.log(`Workspace "${ws.name}" > Created default moderator role :>> `, moderatorRole.name);
		} else {
			moderatorRole = wsModeratorRole;
		}

		// find all service accounts & API keys of this workspace and assign "moderator" role:
		let sas = await DB.update<ServiceAccount>("service_account", { workspaces: ws._id }, { roles: [moderatorRole._id] });
		console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${sas.length} service accounts`);

		let keys = await DB.update<ApiKeyAccount>("api_key_user", { workspaces: ws._id }, { roles: [moderatorRole._id] });
		console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${sas.length} API keys`);
	}
};
