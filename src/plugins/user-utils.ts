import { ObjectId } from "mongodb";

import type { Role, User, Workspace } from "@/entities";
import { DB } from "@/modules/api/DB";
import { RoleService } from "@/services";

import { isObjectId } from "./mongodb";

export const addUserToWorkspace = async (userId: ObjectId, workspace: Workspace, roleType: "admin" | "moderator" | "member" = "member") => {
	let user = await DB.findOne<User>("user", { id: userId });
	if (!user) throw new Error(`User not found.`);

	// find role (default: "member")
	let role: Role = await DB.findOne<Role>("role", { type: roleType, workspace: workspace._id });
	if (!role) throw new Error(`Role "${roleType}" not found.`);

	// assign role
	const roles = user.roles || [];
	const hasRole = roles.map((_id) => _id.toString()).includes(role._id.toString());
	if (!hasRole) roles.push(role._id);

	// assign workspace
	const workspaces = user.workspaces || [];
	const isUserInThisWorkspace = workspaces.map((_id) => _id.toString()).includes(workspace._id.toString());
	if (!isUserInThisWorkspace) workspaces.push(workspace._id);

	// update user data
	[user] = await DB.update<User>("user", { _id: user._id }, { workspaces, roles });

	return user;
};

export const addRoleToUser = async (roleType: "admin" | "moderator" | "member", userId: ObjectId, workspace: Workspace) => {
	let user = await DB.findOne<User>("user", { id: userId });
	if (!user) throw new Error(`User not found.`);

	const role = await DB.findOne<Role>("role", { type: roleType, workspace: workspace._id });
	if (!role) throw new Error(`Role "${roleType}" not found.`);

	const roles = user.roles || [];
	const hasRole = roles.map((_id) => _id.toString()).includes(role._id.toString());
	if (!hasRole) roles.push(role._id);

	[user] = await DB.update<User>("user", { _id: user._id }, { roles });
	return user;
};

export const makeWorkspaceActive = async (userId: ObjectId, workspaceId: ObjectId) => {
	const [user] = await DB.update<User>("user", { _id: userId }, { activeWorkspace: workspaceId });
	return user;
};

export function filterSensitiveInfo(list: User[] = []) {
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

export async function filterRole(workspaceId: string, list: User[] = []) {
	const wsId = workspaceId;
	const roleSvc = new RoleService();
	const wsRoles = await roleSvc.find({ workspace: new ObjectId(workspaceId) });
	// console.log("wsId :>> ", wsId);

	return list.map((item) => {
		if (item.roles && item.roles.length > 0) {
			item.roles = item.roles.filter((role) => {
				if (isObjectId(role)) {
					return wsRoles.map((r) => r._id.toString()).includes(role.toString());
				} else if ((role as Role)._id) {
					return wsRoles.map((r) => r._id.toString()).includes((role as Role)._id.toString());
				} else {
					return false;
				}
			});
		}

		if (item.workspaces && item.workspaces.length > 0) {
			const workspaces = item.workspaces.filter((ws) => {
				if (isObjectId(ws)) {
					return wsId === ws.toString();
				} else if ((ws as Workspace)._id) {
					return wsId === (ws as Workspace)._id.toString();
				} else {
					return false;
				}
			});
			item.workspaces = workspaces;
		}

		return item;
	});
}
