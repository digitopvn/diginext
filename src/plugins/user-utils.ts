import type { IRole, IUser, IWorkspace, UserDto } from "@/entities";
import { RoleService } from "@/services";

import { isObjectId, MongoDB } from "./mongodb";

export const addUserToWorkspace = async (userId: string, workspace: IWorkspace, roleType: "admin" | "moderator" | "member" = "member") => {
	const { DB } = await import("@/modules/api/DB");
	let user = await DB.findOne("user", { id: userId });
	if (!user) throw new Error(`User not found.`);

	// find role (default: "member")
	let role: IRole = await DB.findOne("role", { type: roleType, workspace: workspace._id });
	if (!role) throw new Error(`Role "${roleType}" not found.`);

	// assign role
	const roles = user.roles || [];
	const hasRole = roles.includes(role._id);
	if (!hasRole) roles.push(role._id);

	// assign workspace
	const workspaces = user.workspaces || [];
	const isUserInThisWorkspace = workspaces.includes(workspace._id);
	if (!isUserInThisWorkspace) workspaces.push(workspace._id);

	// update user data
	user = await DB.updateOne("user", { _id: user._id }, { workspaces, roles, activeRole: role._id });

	return user;
};

export const addRoleToUser = async (roleType: "admin" | "moderator" | "member", userId: string, workspace: IWorkspace) => {
	const { DB } = await import("@/modules/api/DB");
	// find user
	let user = await DB.findOne("user", { id: userId }, { populate: ["roles"] });
	if (!user) throw new Error(`User not found.`);

	// find role
	const role = await DB.findOne("role", { type: roleType, workspace: workspace._id });
	if (!role) throw new Error(`Role "${roleType}" not found.`);

	// remove old roles
	const roles = (user.roles || [])
		.filter((_role) => MongoDB.toString((_role as IRole).workspace) !== MongoDB.toString(workspace._id))
		.map((_role) => (_role as IRole)._id);

	// push new role
	roles.push(role._id);

	// update database
	user = await DB.updateOne("user", { _id: user._id }, { roles });
	return { user, role };
};

export const getActiveRole = async (user: IUser, workspace: IWorkspace, options?: { makeActive?: boolean; assignMember?: boolean }) => {
	const { DB } = await import("@/modules/api/DB");
	const userId = MongoDB.toString(user._id);
	const wsId = MongoDB.toString(workspace._id);
	let activeRole: IRole;

	if (!user.roles) user.roles = [];

	// check if "roles" has not been populated:
	let roles: IRole[] = [];
	user.roles.map((r) => {
		if ((r as any)._id) roles.push(r as IRole);
	});

	// populate user's roles if needed
	if (roles.length === 0) {
		user = await DB.findOne("user", { _id: userId }, { populate: ["roles"] });
		user.roles.map((r) => {
			if ((r as any)._id) roles.push(r as IRole);
		});
	}

	// check again if this user have no roles -> assign member role
	if (roles.length === 0) {
		const addRoleRes = await addRoleToUser("member", userId, workspace);
		roles.push(addRoleRes.role);
	}

	// get active role
	activeRole = roles.find((_role) => _role.workspace === wsId);

	// if this user doesn't have any role in this workspace
	if (!activeRole) {
		if (!options?.assignMember) throw new Error(`Permissions denied.`);

		// assign "member" role if needed:
		const memberRole = await DB.findOne("role", { type: "member", workspace: wsId });
		roles.push(memberRole);
		activeRole = memberRole;

		user = await DB.updateOne(
			"user",
			{ _id: user._id },
			{
				roles: roles.map((role) => role._id),
				activeRole: activeRole._id,
			}
		);
	}

	// update database
	if (!user.activeRole && options?.makeActive) user = await DB.updateOne("user", { _id: user._id }, { activeRole: activeRole._id });

	return activeRole;
};

export const getActiveRoleByUserId = async (userId: string, workspace: IWorkspace) => {
	const { DB } = await import("@/modules/api/DB");
	// find user
	let user = await DB.findOne("user", { id: userId }, { populate: ["roles"] });
	if (!user) throw new Error(`User not found.`);

	return getActiveRole(user, workspace);
};

export async function getActiveWorkspace(user: IUser) {
	const { DB } = await import("@/modules/api/DB");
	let workspace = (user.activeWorkspace as any)._id ? (user.activeWorkspace as IWorkspace) : undefined;
	if (!workspace && MongoDB.isValidObjectId(user.activeWorkspace)) {
		workspace = await DB.findOne("workspace", { _id: user.activeWorkspace });
	}
	return workspace;
}

export async function assignRole(role: IRole, user: IUser, options?: { makeActive?: boolean }) {
	const { DB } = await import("@/modules/api/DB");
	// validate
	if (!user.activeRole || !user.activeWorkspace) throw new Error(`Permissions denied.`);

	const activeWorkspace = await getActiveWorkspace(user);
	if (!activeWorkspace) throw new Error(`Permissions denied.`);

	const activeRole = await getActiveRole(user, activeWorkspace);
	if (!activeRole || activeRole.type === "member") throw new Error(`Permissions denied.`);
	if (!activeRole || (activeRole.type === "moderator" && role.type === "admin")) throw new Error(`Permissions denied.`);

	// remove old roles
	const roles = (user.roles || [])
		.filter((_role) => MongoDB.toString((_role as IRole).workspace) !== MongoDB.toString(activeWorkspace._id))
		.map((_role) => (_role as IRole)._id);

	// push a new role
	roles.push(role._id);

	// update database
	const updateData: Partial<UserDto> = { roles };
	if (options?.makeActive) updateData.activeRole = role;
	user = await DB.updateOne("user", { _id: user._id }, { roles });

	// return
	return { user, role };
}

export async function assignRoleByRoleID(roleId: any, user: IUser, options?: { makeActive?: boolean }) {
	const roleSvc = new RoleService();
	const role = await roleSvc.findOne({ _id: roleId });
	if (!role) throw new Error(`Role not found.`);

	return assignRole(role, user, options);
}

export async function assignRoleByUserID(role: IRole, userId: any, options?: { makeActive?: boolean }) {
	const user = await this.findOne({ _id: userId });
	if (!user) throw new Error(`User not found.`);

	return assignRole(role, user, options);
}

export async function assignRoleByID(roleId: any, userId: any, options?: { makeActive?: boolean }) {
	const roleSvc = new RoleService();
	const role = await roleSvc.findOne({ _id: roleId });
	if (!role) throw new Error(`Role not found.`);

	const user = await this.findOne({ _id: userId });
	if (!user) throw new Error(`User not found.`);

	return assignRole(role, user, options);
}

export const makeWorkspaceActive = async (userId: string, workspaceId: string) => {
	const { DB } = await import("@/modules/api/DB");
	const user = await DB.updateOne("user", { _id: userId }, { activeWorkspace: workspaceId });
	return user;
};

export function filterSensitiveInfo(list: IUser[] = []) {
	return list.map((item) => {
		if (item.token) delete item.token;
		if (item.providers && item.providers.length > 0)
			item.providers.map((provider) => {
				delete provider.access_token;
				delete provider.user_id;
				return provider;
			});

		return item;
	});
}

export async function filterUsersByWorkspaceRole(workspaceId: string, list: IUser[] = []) {
	const wsId = workspaceId;
	const roleSvc = new RoleService();
	const wsRoles = await roleSvc.find({ workspace: workspaceId });
	// console.log("wsId :>> ", wsId);

	return list.map((item) => {
		if (item.roles && item.roles.length > 0) {
			item.roles = item.roles.filter((roleId) => {
				if (isObjectId(roleId)) {
					return wsRoles.map((r) => MongoDB.toString(r._id)).includes(MongoDB.toString(roleId));
				} else if ((roleId as IRole)._id) {
					return wsRoles.map((r) => MongoDB.toString(r._id)).includes(MongoDB.toString((roleId as IRole)._id));
				} else {
					return false;
				}
			});
		}

		if (item.workspaces && item.workspaces.length > 0) {
			const workspaces = item.workspaces.filter((ws) => {
				if (isObjectId(ws)) {
					return wsId === MongoDB.toString(ws);
				} else if ((ws as IWorkspace)._id) {
					return wsId === MongoDB.toString((ws as IWorkspace)._id);
				} else {
					return false;
				}
			});
			item.workspaces = workspaces;
		}

		return item;
	});
}
