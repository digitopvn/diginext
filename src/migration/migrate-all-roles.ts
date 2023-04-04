import { isEmpty } from "lodash";

import type { User, Workspace } from "@/entities";
import { Role } from "@/entities";
import type ApiKeyAccount from "@/entities/ApiKeyAccount";
import type ServiceAccount from "@/entities/ServiceAccount";
import { DB } from "@/modules/api/DB";

export const migrateAllRoles = async () => {
	const workspaces = (await DB.find<Workspace>("workspace", {})) || [];

	// create default roles for each workspace: Admin, Moderator & Member
	for (const ws of workspaces) {
		// reset all roles
		// await DB.delete<Role>("role", { workspace: ws._id });

		// Member
		let memberRole: Role;
		const wsMemberRole = await DB.findOne<Role>("role", { type: "member", workspace: ws._id });
		// console.log("wsMemberRole :>> ", wsMemberRole);
		if (!wsMemberRole) {
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
			memberRoleDto.workspace = ws._id;
			memberRoleDto.type = "member";

			memberRole = await DB.create<Role>("role", memberRoleDto);
			if (memberRole) console.log(`Workspace "${ws.name}" > Created default member role :>> `, memberRoleDto.name);
		} else {
			memberRole = wsMemberRole;
		}

		// Admin
		let adminRole: Role;
		const wsAdminRole = await DB.findOne<Role>("role", { type: "admin", workspace: ws._id });
		// console.log("wsAdminRole :>> ", wsAdminRole);

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

		// Moderator
		let moderatorRole: Role;
		const wsModeratorRole = await DB.findOne<Role>("role", { type: "moderator", workspace: ws._id });
		if (!wsModeratorRole) {
			const moderatorRoleDto = new Role();
			moderatorRoleDto.name = "Moderator";
			moderatorRoleDto.routes = [{ route: "*", permissions: ["own", "read", "create", "update"] }];
			moderatorRoleDto.workspace = ws._id;
			moderatorRoleDto.type = "moderator";

			moderatorRole = await DB.create<Role>("role", moderatorRoleDto);
			if (moderatorRole) console.log(`Workspace "${ws.name}" > Created default moderator role :>> `, moderatorRole.name);
		} else {
			moderatorRole = wsModeratorRole;
		}

		// find all service accounts & API keys of this workspace and assign "moderator" role:
		let sas = await DB.find<ServiceAccount>("service_account", { workspaces: ws._id, roles: { $nin: [moderatorRole._id] } });
		if (sas.length > 0) {
			sas = await DB.update<ServiceAccount>("service_account", { workspaces: ws._id }, { roles: [moderatorRole._id] });
			console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${sas.length} service accounts`);
		}

		let keys = await DB.find<ApiKeyAccount>("api_key_user", { workspaces: ws._id, roles: { $nin: [moderatorRole._id] } });
		if (keys.length > 0) {
			keys = await DB.update<ApiKeyAccount>("api_key_user", { workspaces: ws._id }, { roles: [moderatorRole._id] });
			console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${keys.length} API keys`);
		}

		// find members of workspace and assign role:
		let owner = await DB.findOne<User>("user", { _id: ws.owner }, { populate: ["roles"] });
		if (!owner.roles) owner.roles = [];

		// assign admin role to workspace's owner
		const ownerAdminRoles = owner.roles.filter((role) => (role as Role).type === "admin" && (role as Role).workspace === ws._id);
		if (ownerAdminRoles.length === 0) {
			owner.roles.push(adminRole);
			[owner] = await DB.update<User>("user", { _id: owner._id }, { roles: owner.roles.map((role) => (role as Role)._id) });
		}

		// assign member role to other users of the workspace
		let members = await DB.find<User>("user", { workspaces: ws._id }, { populate: ["roles", "workspaces"] });
		if (!isEmpty(members)) {
			members
				.filter((member) => member._id.toString() !== owner._id.toString())
				.map(async (member) => {
					if (!member.roles) member.roles = [];
					const memberRoles = member.roles.filter((role) => (role as Role).type === "member" && (role as Role).workspace === ws._id);
					if (memberRoles.length === 0) {
						member.roles.push(memberRole);
						[member] = await DB.update<User>("user", { _id: member._id }, { roles: member.roles.map((role) => (role as Role)._id) });
					}
				});
		}
		// members = await DB.update<User>("user", { workspaces: ws._id }, { roles: [memberRole._id] });
		// console.log(`Workspace "${ws.name}" > Assign "Member" role to ${members.length} members`);
	}
};
