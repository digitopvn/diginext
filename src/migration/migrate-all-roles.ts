import type { User, Workspace } from "@/entities";
import { Role } from "@/entities";
import { DB } from "@/modules/api/DB";

export const migrateAllRoles = async () => {
	const workspaces = (await DB.find<Workspace>("workspace", {})) || [];

	// create default roles for each workspace: Admin, Moderator & Member
	workspaces.map(async (ws) => {
		// Member
		let memberRole: Role;
		const wsMemberRole = await DB.findOne<Role>("role", { name: "Member", workspace: ws._id });
		if (!wsMemberRole) {
			const memberRoleDto = new Role();
			memberRoleDto.name = "Member";
			memberRoleDto.routes = [{ route: "*", permissions: ["own", "read"] }];
			memberRoleDto.workspace = ws._id;

			memberRole = await DB.create<Role>("role", memberRoleDto);
			if (memberRole) console.log(`Workspace "${ws.name}" > Created default member role :>> `, memberRoleDto.name);
		} else {
			memberRole = wsMemberRole;
		}

		// find other members of the workspace and assign "Member" role
		const members = await DB.find<User>("user", { workspaces: ws._id, roles: memberRole._id });
		if (members.length > 0) {
			await DB.update<User>("user", { workspaces: ws._id }, { roles: [wsMemberRole] });
			console.log(`Workspace "${ws.name}" > Assign "Member" role to ${members.length} members`);
		}

		// Admin
		let adminRole: Role;
		const wsAdminRole = await DB.findOne<Role>("role", { name: "Administrator", workspace: ws._id });

		if (!wsAdminRole) {
			const adminRoleDto = new Role();
			adminRoleDto.name = "Administrator";
			adminRoleDto.routes = [{ route: "*", permissions: ["full"] }];
			adminRoleDto.workspace = ws._id;

			adminRole = await DB.create<Role>("role", adminRoleDto);
			if (adminRole) console.log(`Workspace "${ws.name}" > Created default admin role :>> `, adminRoleDto.name);
		} else {
			adminRole = wsAdminRole;
		}

		// find owner of the workspace and assign "Administrator" role
		let owner = await DB.findOne<User>("user", { roles: adminRole._id, workspaces: ws._id });
		if (owner) {
			[owner] = await DB.update<User>("user", { _id: ws.owner }, { roles: [wsAdminRole] });
			console.log(`Workspace "${ws.name}" > Assign "Administrator" role to "${owner.name}"`);
		}

		// Moderator
		let moderatorRole: Role;
		const wsModeratorRole = await DB.findOne<Role>("role", { name: "Moderator", workspace: ws._id });
		if (!wsModeratorRole) {
			const moderatorRoleDto = new Role();
			moderatorRoleDto.name = "Moderator";
			moderatorRoleDto.routes = [{ route: "*", permissions: ["read", "create", "update"] }];
			moderatorRoleDto.workspace = ws._id;

			moderatorRole = await DB.create<Role>("role", moderatorRoleDto);
			if (moderatorRole) console.log(`Workspace "${ws.name}" > Created default moderator role :>> `, moderatorRole.name);
		} else {
			moderatorRole = wsModeratorRole;
		}
	});
};
