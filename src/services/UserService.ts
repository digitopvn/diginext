import type { IRole } from "@/entities";
import type { IUser, UserDto } from "@/entities/User";
import { userSchema } from "@/entities/User";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import { MongoDB } from "@/plugins/mongodb";

import BaseService from "./BaseService";
import { RoleService } from "./RoleService";

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
		if (!data.username) data.username = data.slug;
		return super.create(data, options);
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
}
