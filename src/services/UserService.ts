import type { IRole } from "@/entities";
import type { IUser, UserDto } from "@/entities/User";
import { userSchema } from "@/entities/User";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import { dxCreateUser } from "@/modules/diginext/dx-user";
import { MongoDB } from "@/plugins/mongodb";
import { getActiveRole } from "@/plugins/user-utils";

import BaseService from "./BaseService";
import { RoleService } from "./RoleService";

export interface UserJoinWorkspaceParams {
	/**
	 * User ID
	 */
	userId: string;
	/**
	 * Workspace's ID or slug
	 */
	workspace: string;
}

export class UserService extends BaseService<IUser> {
	constructor(ownership?: Ownership) {
		super(userSchema, ownership);
	}

	async find(filter?: IQueryFilter<IUser>, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination) {
		// if (filter) filter.type = { $nin: ["service_account", "api_key"] };
		return super.find(filter, options, pagination);
	}

	async findOne(filter?: IQueryFilter<IUser>, options?: IQueryOptions & IQueryPagination) {
		// if (filter) filter.type = { $nin: ["service_account", "api_key"] };
		return super.findOne(filter, options);
	}

	async create(data, options: IQueryOptions = {}) {
		let newUser = await super.create(data, options);
		if (!newUser.username) newUser = await this.updateOne({ _id: newUser._id }, { username: newUser.slug });
		// create user on "dxup.dev" via "dxApi"
		try {
			console.log(newUser.providers[0]);
			const dxUserRes = await dxCreateUser({
				name: newUser.name,
				username: newUser.username,
				image: newUser.image || "",
				providers: newUser.providers[0],
				email: newUser.email,
				password: newUser.password,
				isActive: true,
			});

			console.log("More data:", newUser);

			if (!dxUserRes.status) throw new Error(dxUserRes.messages?.join("\n"));
			if (dxUserRes.data.id) {
				newUser = await this.updateOne({ _id: newUser._id }, { dxUserId: dxUserRes.data.id });
			}
		} catch (e) {
			console.log(`[UserService] create > dxCreateUser :>>`, e);
		}

		return newUser;
	}

	async update(filter: IQueryFilter<IUser>, data: IUser | any, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		return super.update(filter, data, options);
	}

	async assignRole(role: IRole, user: IUser, options?: { makeActive?: boolean }) {
		// validate
		if (!user.activeRole || !user.activeWorkspace) throw new Error(`Permissions denied.`);

		const activeWorkspace = await this.getActiveWorkspace(user);
		if (!activeWorkspace) throw new Error(`Permissions denied.`);

		const activeRole = await this.getActiveRole(user);
		if (!activeRole || activeRole.type === "member") throw new Error(`Permissions denied.`);

		// remove old roles
		const roles = (user.roles || [])
			.filter((_role) => MongoDB.toString((_role as IRole).workspace) !== MongoDB.toString(activeWorkspace._id))
			.map((_role) => (_role as IRole)._id);

		// push a new role
		roles.push(role._id);

		// update database
		const updateData: Partial<UserDto> = { roles };
		if (options?.makeActive) updateData.activeRole = role;
		user = await this.updateOne({ _id: user._id }, { roles });

		// return
		return { user, role };
	}

	async assignRoleByRoleID(roleId: any, user: IUser, options?: { makeActive?: boolean }) {
		const roleSvc = new RoleService();
		const role = await roleSvc.findOne({ _id: roleId });
		if (!role) throw new Error(`Role not found.`);

		return this.assignRole(role, user, options);
	}

	async assignRoleByUserID(role: IRole, userId: any, options?: { makeActive?: boolean }) {
		const user = await this.findOne({ _id: userId });
		if (!user) throw new Error(`User not found.`);

		return this.assignRole(role, user, options);
	}

	async assignRoleByID(roleId: any, userId: any, options?: { makeActive?: boolean }) {
		const roleSvc = new RoleService();
		const role = await roleSvc.findOne({ _id: roleId });
		if (!role) throw new Error(`Role not found.`);

		const user = await this.findOne({ _id: userId });
		if (!user) throw new Error(`User not found.`);

		return this.assignRole(role, user, options);
	}

	async updateAccessPermissions(userSlug: string, resource: { [name: string]: string }) {
		// validation
		if (!userSlug) throw new Error(`Param "userSlug" is required.`);
		if (!resource) throw new Error(`Param "resource" is required.`);

		// process
		const updateData: { [key: string]: string[] } = {};
		Object.entries(resource).forEach(([key, val]) => {
			let resourceIds = !val ? [] : val.length > 0 && val.indexOf(",") > -1 ? val.split(",") : [val];
			resourceIds.map((id) => {
				if (!MongoDB.isValidObjectId(id)) throw new Error(`Invalid "resource" data, "${id}" is not a valid MongoDB ObjectID.`);
				return id;
			});
			updateData[`allowAccess.${key}`] = resourceIds;
		});

		const updatedUser = this.updateOne({ slug: userSlug }, updateData);
		if (!updatedUser) throw new Error(`Unable to update user's access permissions.`);

		// result
		return updatedUser;
	}

	async joinWorkspace(data: UserJoinWorkspaceParams, options?: IQueryOptions) {
		const { userId: uid, workspace: workspaceIdOrSlug } = data;

		if (!uid) throw new Error(`Param "userId" (User ID) is required.`);
		if (!workspaceIdOrSlug) throw new Error(`Param "workspace" (Workspace ID or slug) is required.`);

		// parse input params
		const userId = uid;

		// workspace in query could be "_id" and also "slug":
		let workspaceId = MongoDB.isValidObjectId(workspaceIdOrSlug) || MongoDB.isObjectId(workspaceIdOrSlug) ? workspaceIdOrSlug : undefined;
		// return undefined if can't convert to "ObjectId" -> it's a "slug" !!! (lol)
		let workspaceSlug = !workspaceId ? workspaceIdOrSlug : undefined;

		if (!workspaceId && !workspaceSlug) throw new Error(`Param "workspace" (ID or SLUG) is invalid`);

		const wsFilter: any = {};
		if (workspaceId) wsFilter._id = workspaceId;
		if (workspaceSlug) wsFilter.slug = workspaceSlug;

		// find the workspace
		const { WorkspaceService } = await import("./WorkspaceService");
		const workspaceSvc = new WorkspaceService(this.ownership);
		const workspace = await workspaceSvc.findOne(wsFilter);
		if (!workspace) throw new Error(`Workspace not found.`);
		console.log("workspace", workspace);
		if (!workspace.dx_key) throw new Error(`Workspace is invalid (missing "dx_key").`);
		if (!workspace.dx_id) throw new Error(`Workspace is invalid (missing "dx_id").`);

		workspaceId = MongoDB.toString(workspace._id);

		// find the user
		let user = await this.findOne({ _id: userId }, { populate: ["roles"] });
		if (!user) throw new Error(`User not found.`);
		// console.dir(user, { depth: 10 });
		// create user on "dxup.dev" via "dxApi"
		if (user.dxUserId) {
			try {
				const dxUserRes = await dxCreateUser({
					name: user.name,
					username: user.username || user.slug,
					email: user.email,
					password: user.password,
					isActive: true,
				});
				if (!dxUserRes.status) throw new Error(dxUserRes.messages.join("\n"));
				if (dxUserRes.data.id) {
					const userSvc = new UserService(this.ownership);
					user = await userSvc.updateOne({ _id: user._id }, { dxUserId: dxUserRes.data.id });
				}
			} catch (e) {
				console.log(`[WorkspaceService] create > dxCreateUser :>>`, e);
			}
		}

		const wsId = workspaceId;
		const workspaceIds = user.workspaces || [];
		const isUserInWorkspace = workspaceIds.includes(wsId);

		// check if this is a private workspace:
		if (!workspace.public) {
			// if this user hasn't joined yet:
			if (!isUserInWorkspace) throw new Error(`Missing access to this private workspace, contact workspace admin for an invitation.`);
		}

		// add this workspace to user's workspace list
		if (!isUserInWorkspace) workspaceIds.push(workspaceId);

		// set active workspace of this user -> this workspace
		user = await this.updateOne({ _id: userId }, { activeWorkspace: workspaceId, workspaces: workspaceIds }, options);

		// set active role
		const activeRole = await getActiveRole(user, workspace, { makeActive: true, assignMember: true });
		user.activeRole = activeRole;

		return user;
	}
}
