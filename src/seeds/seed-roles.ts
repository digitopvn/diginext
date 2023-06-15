import { Config } from "@/app.config";
import type { IRole, IUser, IWorkspace, RoleRoute } from "@/entities";
import { credentialFields } from "@/interfaces/SystemTypes";
import { DB } from "@/modules/api/DB";
import { MongoDB } from "@/plugins/mongodb";

// seed default roles of a workspace
export const seedDefaultRoles = async (workspace: IWorkspace, owner: IUser) => {
	// ADMIN
	let adminRole = await DB.findOne<IRole>("role", { type: "admin", workspace: workspace._id });
	let adminMaskedFields: string[] = [];
	if (!Config.SHARE_RESOURCE_CREDENTIAL) adminMaskedFields = [...credentialFields];

	if (!adminRole) {
		const adminRoleDto = {} as IRole;
		adminRoleDto.name = "Administrator";
		adminRoleDto.routes = [{ route: "*", permissions: ["full"] }];
		adminRoleDto.workspace = workspace._id;
		adminRoleDto.type = "admin";
		adminRoleDto.maskedFields = adminMaskedFields;

		adminRole = await DB.create<IRole>("role", adminRoleDto);
		console.log(`Workspace "${workspace.name}" > Created default admin role :>> `, adminRoleDto.name);
	} else {
		if (adminRole.maskedFields?.join(",") !== adminMaskedFields.join(",")) {
			adminRole = await DB.updateOne<IRole>("role", { _id: adminRole._id }, { maskedFields: adminMaskedFields });
		}
	}

	// assign admin role to the "owner" user
	const fullOwner = await DB.findOne<IUser>("user", { _id: owner._id }, { populate: ["roles", "activeWorkspace"] });

	let ownerRoles = (fullOwner?.roles || []) as IRole[];

	const ownerHasAdminRole = ownerRoles.map((role) => role._id).includes(MongoDB.toString(adminRole._id));

	if (!ownerHasAdminRole) {
		ownerRoles = ownerRoles.filter((role) => MongoDB.toString(role.workspace) !== MongoDB.toString(workspace._id));
		ownerRoles.push(adminRole);
		// update role ids
		const roleIds = ownerRoles.map((role) => role._id);
		const [user] = await DB.update<IUser>("user", { _id: owner._id }, { roles: roleIds });
		// console.log(`Workspace "${workspace.name}" > User "${user.name}" is now an administrator.`);
	}

	// MEMBER
	let memberRole = await DB.findOne<IRole>("role", { type: "member", workspace: workspace._id });
	const memberRoleRoutes: RoleRoute[] = [
		{ route: "*", permissions: ["own", "read"] },
		{ route: "/api/v1/deploy", permissions: ["read", "create", "update"] },
		{ route: "/api/v1/domain", permissions: ["read", "create", "update"] },
		{ route: "/api/v1/project", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/app", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/app/environment", permissions: ["full"] },
		{ route: "/api/v1/app/environment/variables", permissions: ["full"] },
		{ route: "/api/v1/build/start", permissions: ["full"] },
		{ route: "/api/v1/build/stop", permissions: ["full"] },
		{ route: "/api/v1/release", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/release/from-build", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/release/preview", permissions: ["own", "read", "create", "update"] },
		{ route: "/api/v1/git/public-key", permissions: [] },
		{ route: "/api/v1/git/ssh/create", permissions: [] },
		{ route: "/api/v1/git/ssh/generate", permissions: [] },
		{ route: "/api/v1/git/ssh/verify", permissions: [] },
		{ route: "/api/v1/user/join-workspace", permissions: ["update"] },
		{ route: "/api/v1/role", permissions: ["read"] },
		{ route: "/api/v1/api_key", permissions: [] },
		{ route: "/api/v1/service_account", permissions: ["read"] },
	];

	const memberRoleMaskedFields = ["email", ...credentialFields];

	if (!memberRole) {
		const memberRoleDto = {} as IRole;
		memberRoleDto.name = "Member";
		memberRoleDto.routes = memberRoleRoutes;
		memberRoleDto.workspace = workspace._id;
		memberRoleDto.type = "member";
		memberRoleDto.maskedFields = memberRoleMaskedFields;

		memberRole = await DB.create<IRole>("role", memberRoleDto);
		console.log(`Workspace "${workspace.name}" > Created default member role :>> `, memberRoleDto.name);
	} else {
		// Update maskFields if it's not correct
		if (memberRole.maskedFields?.join(",") !== memberRoleMaskedFields.join(",")) {
			memberRole = await DB.updateOne<IRole>("role", { _id: memberRole._id }, { maskedFields: memberRoleMaskedFields });
		}

		// compare routes & permissions, if it doesn't match -> update!
		const defaultMemberRoleRoutes = memberRoleRoutes.map((r) => `${r.route}:${r.permissions?.join(",")}`).join("|");
		const dbMemberRoleRoutes = memberRole.routes.map((r) => `${r.route}:${r.permissions?.join(",")}`).join("|");
		if (defaultMemberRoleRoutes !== dbMemberRoleRoutes) {
			[memberRole] = await DB.update<IRole>("role", { _id: memberRole._id }, { routes: memberRoleRoutes });
			console.log(`Workspace "${workspace.name}" > Updated default member role!`);
		}
	}

	// MODERATOR
	let moderatorRole = await DB.findOne<IRole>("role", { type: "moderator", workspace: workspace._id });
	const moderatorRoleRoutes: RoleRoute[] = [{ route: "*", permissions: ["own", "read", "create", "update"] }];

	if (!moderatorRole) {
		const moderatorRoleDto = {} as IRole;
		moderatorRoleDto.name = "Moderator";
		moderatorRoleDto.routes = moderatorRoleRoutes;
		moderatorRoleDto.workspace = workspace._id;
		moderatorRoleDto.type = "moderator";
		moderatorRoleDto.maskedFields = adminMaskedFields;

		moderatorRole = await DB.create<IRole>("role", moderatorRoleDto);
		console.log(`Workspace "${workspace.name}" > Created default moderator role :>> `, moderatorRole.name);
	} else {
		// Update maskedFields if it is incorrect
		if (moderatorRole.maskedFields?.join(",") !== adminMaskedFields.join(",")) {
			moderatorRole = await DB.updateOne<IRole>("role", { _id: moderatorRole._id }, { maskedFields: adminMaskedFields });
		}

		// compare routes & permissions, if it doesn't match -> update!
		const defaultModRoleRoutes = moderatorRoleRoutes.map((r) => `${r.route}:${r.permissions?.join(",")}`).join("|");
		const dbModRoleRoutes = moderatorRole.routes.map((r) => `${r.route}:${r.permissions?.join(",")}`).join("|");
		if (defaultModRoleRoutes !== dbModRoleRoutes) {
			[moderatorRole] = await DB.update<IRole>("role", { _id: moderatorRole._id }, { routes: moderatorRoleRoutes });
			console.log(`Workspace "${workspace.name}" > Updated default moderator role!`);
		}
	}

	return [adminRole, memberRole, moderatorRole];
};
