import type { IUser, IWorkspace, RoleRoute, User } from "@/entities";
import { Role } from "@/entities";
import { DB } from "@/modules/api/DB";
import { MongoDB } from "@/plugins/mongodb";

// seed default roles of a workspace
export const seedDefaultRoles = async (workspace: IWorkspace, owner: IUser) => {
	// ADMIN
	let adminRole: Role = await DB.findOne<Role>("role", { type: "admin", workspace: workspace._id });

	if (!adminRole) {
		const adminRoleDto = new Role();
		adminRoleDto.name = "Administrator";
		adminRoleDto.routes = [{ route: "*", permissions: ["full"] }];
		adminRoleDto.workspace = workspace._id;
		adminRoleDto.type = "admin";
		adminRoleDto.maskedFields = [];

		adminRole = await DB.create<Role>("role", adminRoleDto);
		console.log(`Workspace "${workspace.name}" > Created default admin role :>> `, adminRoleDto.name);
	}

	// assign admin role to the "owner" user
	const fullOwner = await DB.findOne<User>("user", { _id: owner._id }, { populate: ["roles"] });
	let userRoles = (fullOwner.roles || []) as Role[];
	// console.log("userRoles :>> ", userRoles);
	// console.log("adminRole._id :>> ", adminRole._id);
	const userHasAdminRole = userRoles.map((role) => MongoDB.toString(role._id)).includes(MongoDB.toString(adminRole._id));
	// console.log(userRoles.map((role) => MongoDB.toString(role._id)));
	// console.log(MongoDB.toString(adminRole._id));
	// console.log(`Workspace "${workspace.name}" > userHasAdminRole :>> `, userHasAdminRole);

	if (!userHasAdminRole) {
		userRoles = userRoles.filter((role) => MongoDB.toString(role.workspace) !== MongoDB.toString(workspace._id));
		userRoles.push(adminRole);
		// update role ids
		const roleIds = userRoles.map((role) => role._id);
		const [user] = await DB.update<User>("user", { _id: owner._id }, { roles: roleIds });
		// console.log(`Workspace "${workspace.name}" > User "${user.name}" is now an administrator.`);
	}

	// MEMBER
	let memberRole: Role = await DB.findOne<Role>("role", { type: "member", workspace: workspace._id });
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

	if (!memberRole) {
		const memberRoleDto = new Role();
		memberRoleDto.name = "Member";
		memberRoleDto.routes = memberRoleRoutes;
		memberRoleDto.workspace = workspace._id;
		memberRoleDto.type = "member";
		memberRoleDto.maskedFields = [
			"email",
			"apiAccessToken",
			"serviceAccount",
			"dockerPassword",
			"kubeConfig",
			"token.access_token",
			"imagePullSecret.value",
			"metadata.email",
			"metadata.apiAccessToken",
			"metadata.serviceAccount",
			"metadata.dockerPassword",
			"metadata.kubeConfig",
		];

		memberRole = await DB.create<Role>("role", memberRoleDto);
		console.log(`Workspace "${workspace.name}" > Created default member role :>> `, memberRoleDto.name);
	} else {
		// compare routes & permissions, if it doesn't match -> update!
		const defaultMemberRoleRoutes = memberRoleRoutes.map((r) => `${r.route}:${r.permissions.join(",")}`).join("|");
		const dbMemberRoleRoutes = memberRole.routes.map((r) => `${r.route}:${r.permissions.join(",")}`).join("|");
		if (defaultMemberRoleRoutes !== dbMemberRoleRoutes) {
			[memberRole] = await DB.update<Role>("role", { _id: memberRole._id }, { routes: memberRoleRoutes });
			console.log(`Workspace "${workspace.name}" > Updated default member role!`);
		}
	}

	// MODERATOR
	let moderatorRole: Role = await DB.findOne<Role>("role", { type: "moderator", workspace: workspace._id });
	const moderatorRoleRoutes: RoleRoute[] = [{ route: "*", permissions: ["own", "read", "create", "update"] }];

	if (!moderatorRole) {
		const moderatorRoleDto = new Role();
		moderatorRoleDto.name = "Moderator";
		moderatorRoleDto.routes = moderatorRoleRoutes;
		moderatorRoleDto.workspace = workspace._id;
		moderatorRoleDto.type = "moderator";
		moderatorRoleDto.maskedFields = [];

		moderatorRole = await DB.create<Role>("role", moderatorRoleDto);
		console.log(`Workspace "${workspace.name}" > Created default moderator role :>> `, moderatorRole.name);
	} else {
		// compare routes & permissions, if it doesn't match -> update!
		const defaultModRoleRoutes = moderatorRoleRoutes.map((r) => `${r.route}:${r.permissions.join(",")}`).join("|");
		const dbModRoleRoutes = moderatorRole.routes.map((r) => `${r.route}:${r.permissions.join(",")}`).join("|");
		if (defaultModRoleRoutes !== dbModRoleRoutes) {
			[moderatorRole] = await DB.update<Role>("role", { _id: moderatorRole._id }, { routes: moderatorRoleRoutes });
			console.log(`Workspace "${workspace.name}" > Updated default moderator role!`);
		}
	}

	return [adminRole, memberRole, moderatorRole];
};
