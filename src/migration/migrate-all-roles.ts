import type { User, Workspace } from "@/entities";
import { Role } from "@/entities";
import { DB } from "@/modules/api/DB";

export const migrateAllRoles = async () => {
	const workspaces = (await DB.find<Workspace>("workspace", {})) || [];

	// create default roles for each workspace: Admin, Moderator & Member
	workspaces.map(async (ws) => {
		// Admin
		let admin: Role;
		const wsAdminRole = await DB.findOne<Role>("role", { name: "Administrator", workspace: ws._id });
		if (!wsAdminRole) {
			const adminRole = new Role();
			adminRole.name = "Administrator";
			adminRole.routes = [{ route: "*", permissions: ["full"] }];
			adminRole.workspace = ws._id;
			admin = await DB.create<Role>("role", adminRole);
			if (admin) console.log(`Workspace "${ws.name}" > Created default admin role :>> `, admin.name);
		} else {
			admin = wsAdminRole;
		}

		// find owner of the workspace and assign "Administrator" role
		let owner = await DB.findOne<User>("user", { roles: { $ne: admin._id }, workspaces: ws._id });
		if (!owner) {
			[owner] = await DB.update<User>("user", { _id: ws.owner }, { roles: [wsAdminRole] });
			console.log(`Workspace "${ws.name}" > Assign "Administrator" role to "${owner.name}"`);
		}

		// Moderator
		let moderator: Role;
		const wsModeratorRole = await DB.findOne<Role>("role", { name: "Moderator", workspace: ws._id });
		if (!wsModeratorRole) {
			const moderatorRole = new Role();
			moderatorRole.name = "Moderator";
			moderatorRole.routes = [{ route: "*", permissions: ["read", "create", "update"] }];
			moderatorRole.workspace = ws._id;
			moderator = await DB.create<Role>("role", moderatorRole);
			if (moderator) console.log(`Workspace "${ws.name}" > Created default moderator role :>> `, moderator.name);
		} else {
			moderator = wsModeratorRole;
		}

		// Member
		let memberRole: Role;
		const wsMemberRole = await DB.findOne<Role>("role", { name: "Member", workspace: ws._id });
		if (!wsMemberRole) {
			memberRole = new Role();
			memberRole.name = "Member";
			memberRole.routes = [{ route: "*", permissions: ["own", "read"] }];
			memberRole.workspace = ws._id;

			memberRole = await DB.create<Role>("role", memberRole);
			if (memberRole) console.log(`Workspace "${ws.name}" > Created default member role :>> `, memberRole.name);
		} else {
			memberRole = wsMemberRole;
		}

		// find other members of the workspace and assign "Member" role
		const members = await DB.find<User>("user", { workspaces: ws._id, roles: { $ne: admin._id } });
		if (members.length > 0) {
			await DB.update<User>("user", { workspaces: ws._id, roles: { $ne: admin._id } }, { roles: [wsMemberRole] });
			console.log(`Workspace "${ws.name}" > Assign "Member" role to ${members.length} members`);
		}
	});
};
