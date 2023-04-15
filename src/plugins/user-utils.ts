import { ObjectId } from "mongodb";

import type { IRole, IUser, IWorkspace, Role, Workspace } from "@/entities";
import { DB } from "@/modules/api/DB";
import { RoleService } from "@/services";

import { isObjectId, MongoDB } from "./mongodb";

export const addUserToWorkspace = async (userId: ObjectId, workspace: IWorkspace, roleType: "admin" | "moderator" | "member" = "member") => {
	let user = await DB.findOne<IUser>("user", { id: userId });
	if (!user) throw new Error(`User not found.`);

	// find role (default: "member")
	let role: Role = await DB.findOne<Role>("role", { type: roleType, workspace: workspace._id });
	if (!role) throw new Error(`Role "${roleType}" not found.`);

	// assign role
	const roles = user.roles || [];
	const hasRole = roles.map((_id) => MongoDB.toString(_id)).includes(MongoDB.toString(role._id));
	if (!hasRole) roles.push(role._id);

	// assign workspace
	const workspaces = user.workspaces || [];
	const isUserInThisWorkspace = workspaces.map((_id) => MongoDB.toString(_id)).includes(MongoDB.toString(workspace._id));
	if (!isUserInThisWorkspace) workspaces.push(workspace._id);

	// update user data
	[user] = await DB.update<IUser>("user", { _id: user._id }, { workspaces, roles });

	return user;
};

export const addRoleToUser = async (roleType: "admin" | "moderator" | "member", userId: ObjectId, workspace: IWorkspace) => {
	// find user
	let user = await DB.findOne<IUser>("user", { id: userId }, { populate: ["roles"] });
	if (!user) throw new Error(`User not found.`);

	// find role
	const role = await DB.findOne<IRole>("role", { type: roleType, workspace: workspace._id });
	if (!role) throw new Error(`Role "${roleType}" not found.`);

	// remove old roles
	const roles = (user.roles || [])
		.filter((_role) => MongoDB.toString((_role as IRole).workspace) !== MongoDB.toString(workspace._id))
		.map((_role) => (_role as Role)._id);

	// push new role
	roles.push(role._id);

	// update database
	[user] = await DB.update<IUser>("user", { _id: user._id }, { roles });
	return user;
};

export const makeWorkspaceActive = async (userId: ObjectId, workspaceId: ObjectId) => {
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
	const wsRoles = await roleSvc.find({ workspace: new ObjectId(workspaceId) });
	// console.log("wsId :>> ", wsId);

	return list.map((item) => {
		if (item.roles && item.roles.length > 0) {
			item.roles = item.roles.filter((role) => {
				if (isObjectId(role)) {
					return wsRoles.map((r) => MongoDB.toString(r._id)).includes(MongoDB.toString(role));
				} else if ((role as Role)._id) {
					return wsRoles.map((r) => MongoDB.toString(r._id)).includes(MongoDB.toString((role as Role)._id));
				} else {
					return false;
				}
			});
		}

		if (item.workspaces && item.workspaces.length > 0) {
			const workspaces = item.workspaces.filter((ws) => {
				if (isObjectId(ws)) {
					return wsId === MongoDB.toString(ws);
				} else if ((ws as Workspace)._id) {
					return wsId === MongoDB.toString((ws as Workspace)._id);
				} else {
					return false;
				}
			});
			item.workspaces = workspaces;
		}

		return item;
	});
}
