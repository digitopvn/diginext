import { upperFirst } from "lodash";

import type { IApp, IProject, IRole, IUser, IWorkspace, UserDto } from "@/entities";
import type { IBase } from "@/entities/Base";
import type { IQueryFilter } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import type { AppService, BaseService, ProjectService } from "@/services";
import { RoleService, UserService } from "@/services";

import { MongoDB } from "./mongodb";

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

export async function assignRoleWithoutCheckingPermissions(roleId: string, toUser: IUser, ownership?: Ownership) {
	const roleSvc = new RoleService();
	const toBeUpdatedRole = await roleSvc.findOne({ _id: roleId });
	const roleWorkspaceId = MongoDB.toString(toBeUpdatedRole.workspace);

	// filter: same role & same workspace roles
	const roles = toUser.roles
		.map((role) => role as IRole)
		.filter((role) => MongoDB.toString(role.workspace) !== roleWorkspaceId)
		.filter((role) => MongoDB.toString(role._id) !== MongoDB.toString(roleId))
		.map((role) => role._id);

	// push new role id
	roles.push(MongoDB.toObjectId(roleId));

	// update user
	const userSvc = new UserService(ownership);
	return userSvc.updateOne({ _id: toUser._id }, { roles });
}

export async function assignRole(role: IRole, user: IUser, options?: { makeActive?: boolean }) {
	const userSvc = new UserService();

	// validate
	if (!user.activeRole || !user.activeWorkspace) throw new Error(`Permissions denied.`);

	const activeWorkspace = await getActiveWorkspace(user);
	if (!activeWorkspace) throw new Error(`Permissions denied.`);

	const activeRole = await getActiveRole(user, activeWorkspace);
	// current role "member" -> cannot assign any roles to others
	if (!activeRole || activeRole.type === "member") throw new Error(`Permissions denied.`);
	// current role "moderator" -> cannot assign "admin" role to others
	if (!activeRole || (activeRole.type === "moderator" && role.type === "admin")) throw new Error(`Permissions denied.`);

	// remove old roles
	const roles = (user.roles || [])
		.filter((_role) => MongoDB.toString((_role as IRole).workspace) !== MongoDB.toString(activeWorkspace._id))
		.map((_role) => (_role as IRole)._id);

	// push a new role
	roles.push(role._id);
	console.log("assignRole > new roles :>> ", roles);
	// update database
	const updateData: Partial<UserDto> = { roles };
	if (options?.makeActive) updateData.activeRole = role;
	user = await userSvc.updateOne({ _id: user._id }, { roles });

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
	// console.log("wsRoles :>> ", wsRoles);
	// console.log("list :>> ", list);

	return list
		.map((user) => {
			if (user && user.roles && user.roles.length > 0) {
				user.roles = user.roles.filter((role) => {
					if (MongoDB.isValidObjectId(role)) {
						return wsRoles.map((r) => MongoDB.toString(r._id)).includes(MongoDB.toString(role));
					} else if ((role as IRole)._id) {
						return wsRoles.map((r) => MongoDB.toString(r._id)).includes(MongoDB.toString((role as IRole)._id));
					} else {
						return false;
					}
				});
			}

			if (user && user.workspaces && user.workspaces.length > 0) {
				user.workspaces = user.workspaces.filter((ws) => {
					if (MongoDB.isValidObjectId(ws)) {
						return wsId === MongoDB.toString(ws);
					} else if ((ws as IWorkspace)._id) {
						return wsId === MongoDB.toString((ws as IWorkspace)._id);
					} else {
						return false;
					}
				});
			}

			// console.log("user.workspaces :>> ", user?.workspaces);
			// console.log("user.roles :>> ", user?.roles);

			return user;
		})
		.filter((user) => typeof user !== "undefined" && user !== null);
}

export function checkProjectPermissionsById(projectId: any, user?: IUser) {
	if (!MongoDB.isValidObjectId(projectId)) throw new Error(`Project ID is invalid: "${projectId}"`);
	if (user && user.allowAccess?.projects?.length > 0) {
		if (!user.allowAccess?.projects?.map((p) => MongoDB.toString(p)).includes(MongoDB.toString(projectId)))
			throw new Error(`You don't have permissions in this project.`);
	}
}

export function checkProjectPermissions(project: IProject, user?: IUser) {
	checkProjectPermissionsById(project._id, user);
}

export async function checkProjectPermissionsByFilter(svc: ProjectService, filter: IQueryFilter<IProject>, user?: IUser) {
	if (user && user.allowAccess) {
		const projects = await svc.find(filter);
		projects.forEach((project) => {
			// check APP access permissions
			checkProjectPermissions(project, user);
		});
	}
}

export function checkAppPermissionsById(appId: any, user?: IUser) {
	if (!MongoDB.isValidObjectId(appId)) throw new Error(`App ID is invalid: "${appId}"`);
	if (user && user?.allowAccess?.apps?.length > 0) {
		if (!user?.allowAccess?.apps?.map((p) => MongoDB.toString(p)).includes(MongoDB.toString(appId))) {
			throw new Error(`Permission denied.`);
		}
	}
}

export function checkAppPermissions(app: IApp, user?: IUser) {
	checkAppPermissionsById(app._id, user);
}

export async function checkAppPermissionsByFilter(svc: AppService, filter: IQueryFilter<IApp>, user?: IUser) {
	if (user && user.allowAccess) {
		const apps = await svc.find(filter);
		apps.forEach((app) => {
			// check APP access permissions
			checkAppPermissions(app, user);
		});
	}
}

export async function checkProjectAndAppPermissions(svc: AppService, filter: IQueryFilter<IApp>, user?: IUser) {
	if (user && user.allowAccess) {
		const apps = await svc.find(filter);
		apps.forEach((app) => {
			// check PROJECT access permissions
			checkProjectPermissionsById(app.project, user);
			// check APP access permissions
			checkAppPermissions(app, user);
		});
	}
}

export function checkPermissionsById(
	resource: "clusters" | "cloud_databases" | "cloud_database_backups" | "gits" | "frameworks" | "container_registries",
	id: any,
	user?: IUser
) {
	if (!MongoDB.isValidObjectId(id)) throw new Error(`${upperFirst(resource)} ID is invalid: "${id}"`);
	if (user && user.allowAccess && user.allowAccess[resource] && user.allowAccess[resource].length > 0) {
		const allowedResources = user.allowAccess[resource];
		if (!allowedResources?.map((item) => MongoDB.toString(item)).includes(MongoDB.toString(id)))
			throw new Error(`You don't have permissions in this ${resource}.`);
	}
}

export function checkPermissions(
	resource: "clusters" | "cloud_databases" | "cloud_database_backups" | "gits" | "frameworks" | "container_registries",
	item: IBase,
	user?: IUser
) {
	checkPermissionsById(resource, item._id, user);
}

export async function checkPermissionsByFilter(
	resource: "clusters" | "cloud_databases" | "cloud_database_backups" | "gits" | "frameworks" | "container_registries",
	svc: BaseService,
	filter: IQueryFilter<any>,
	user?: IUser
) {
	if (user && user.allowAccess && user.allowAccess[resource] && user.allowAccess[resource].length > 0) {
		const items = await svc.find(filter);
		items.forEach((item) => {
			checkPermissions(resource, item, user);
		});
	}
}
