import { ObjectId } from "mongodb";

import type { Role, User, Workspace } from "@/entities";
import { RoleService } from "@/services";

import { isObjectId } from "./mongodb";

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
