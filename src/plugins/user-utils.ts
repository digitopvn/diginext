import type { IRole, IUser, IWorkspace } from "@/entities";
import { DB } from "@/modules/api/DB";
import { RoleService } from "@/services";

import { isObjectId, MongoDB } from "./mongodb";

export const addUserToWorkspace = async (userId: string, workspace: IWorkspace, roleType: "admin" | "moderator" | "member" = "member") => {
	let user = await DB.findOne<IUser>("user", { id: userId });
	if (!user) throw new Error(`User not found.`);

	// find role (default: "member")
	let role: IRole = await DB.findOne<IRole>("role", { type: roleType, workspace: workspace._id });
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
	[user] = await DB.update<IUser>("user", { _id: user._id }, { workspaces, roles });

	return user;
};

export const addRoleToUser = async (roleType: "admin" | "moderator" | "member", userId: string, workspace: IWorkspace) => {
	// find user
	let user = await DB.findOne<IUser>("user", { id: userId }, { populate: ["roles"] });
	if (!user) throw new Error(`User not found.`);

	// find role
	const role = await DB.findOne<IRole>("role", { type: roleType, workspace: workspace._id });
	if (!role) throw new Error(`Role "${roleType}" not found.`);

	// remove old roles
	const roles = (user.roles || [])
		.filter((_role) => MongoDB.toString((_role as IRole).workspace) !== MongoDB.toString(workspace._id))
		.map((_role) => (_role as IRole)._id);

	// push new role
	roles.push(role._id);

	// update database
	[user] = await DB.update<IUser>("user", { _id: user._id }, { roles });
	return user;
};

export const makeWorkspaceActive = async (userId: string, workspaceId: string) => {
	const [user] = await DB.update<IUser>("user", { _id: userId }, { activeWorkspace: workspaceId });
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

export async function filterRole(workspaceId: string, list: IUser[] = []) {
	const wsId = workspaceId;
	const roleSvc = new RoleService();
	const wsRoles = await roleSvc.find({ workspace: workspaceId });
	// console.log("wsId :>> ", wsId);

	return list.map((item) => {
		if (item.roles && item.roles.length > 0) {
			item.roles = item.roles.filter((roldId) => {
				if (isObjectId(roldId)) {
					return wsRoles.map((r) => MongoDB.toString(r._id)).includes(MongoDB.toString(roldId));
				} else if ((roldId as IRole)._id) {
					return wsRoles.map((r) => MongoDB.toString(r._id)).includes(MongoDB.toString((roldId as IRole)._id));
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
