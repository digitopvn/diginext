import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "@tsoa/runtime";
import { isArray } from "lodash";

import BaseController from "@/controllers/BaseController";
import type { IUser } from "@/entities";
import { UserDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import { MongoDB } from "@/plugins/mongodb";
import { assignRoleByID, assignRoleWithoutCheckingPermissions, filterSensitiveInfo, filterUsersByWorkspaceRole } from "@/plugins/user-utils";
import { UserJoinWorkspaceParams, UserService } from "@/services/UserService";

@Tags("User")
@Route("user")
export default class UserController extends BaseController<IUser> {
	service: UserService;

	constructor() {
		super(new UserService());
	}

	/**
	 * List of users
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: IGetQueryParams) {
		const res = await super.read();

		// console.log("[1] res.data :>> ", res.data);
		if (isArray(res.data)) {
			res.data = await filterUsersByWorkspaceRole(MongoDB.toString(this.workspace._id), res.data);
			res.data = filterSensitiveInfo(res.data);
		} else {
			res.data = await filterUsersByWorkspaceRole(MongoDB.toString(this.workspace._id), [res.data]);
			res.data = filterSensitiveInfo([res.data]);
		}
		// console.log("[2] res.data :>> ", res.data);
		return res;
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/profile")
	async profile(@Queries() queryParams?: IGetQueryParams) {
		console.log("[USER_CONTROLLER] profile() > this.user :>> ", this.user);
		if (!this.user.username) {
			// create username from slug (if not exists)
			await this.service.updateOne({ _id: this.user._id }, { username: this.user.slug }).catch((e) => {
				console.error(`Unable to update "username" of this user (${this.user._id}): ${e}`);
			});
		}
		return this.user ? respondSuccess({ data: this.user }) : respondFailure(`Unauthenticated.`);
	}

	@Security("api_key2")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: UserDto, @Queries() queryParams?: IPostQueryParams) {
		try {
			const newUser = await this.service.create(body, this.options);
			return newUser ? respondSuccess({ data: newUser }) : respondFailure(`Failed to create user.`);
		} catch (e) {
			return respondFailure(`Failed to create user: ${e}`);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: UserDto, @Queries() queryParams?: IPostQueryParams) {
		// console.log("body.roles :>> ", body.roles);
		try {
			if (body.roles) {
				try {
					// find list of affected users
					const users = await this.service.find(this.filter, { populate: ["roles"] });
					users.forEach(async (user) => {
						if (isArray(body.roles)) {
							await Promise.all(
								body.roles.map((roleId) => assignRoleWithoutCheckingPermissions(MongoDB.toString(roleId), user, this.ownership))
							);
						} else if (MongoDB.isValidObjectId(body.roles)) {
							const roleId = body.roles;
							return assignRoleWithoutCheckingPermissions(MongoDB.toString(roleId), user, this.ownership);
						}
					});
					delete body.roles;
				} catch (e) {
					return respondFailure(`Unable to update role: ${e}`);
				}
			}

			// ! [MAGIC] if the item to be updated is the current logged in user -> allow it to happen!
			if (this.filter.owner && MongoDB.toString(this.filter.owner) === MongoDB.toString(this.user._id)) delete this.filter.owner;

			const updatedUsers = await this.service.update(this.filter, body, this.options);
			return updatedUsers && updatedUsers.length > 0 ? respondSuccess({ data: updatedUsers }) : respondFailure(`Failed to update users.`);
		} catch (e) {
			return respondFailure(`Failed to update users: ${e}`);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/assign-role")
	async assignRole(@Body() body: { roleId: string; userId: string }) {
		try {
			if (!body.roleId) throw new Error(`Param "roleId" is required.`);
			if (!body.userId) throw new Error(`Param "userId" is required.`);

			const { user, role } = await assignRoleByID(body.roleId, body.userId);
			return respondSuccess({ data: { user, role } });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/join-workspace")
	async joinWorkspace(@Body() body: UserJoinWorkspaceParams) {
		// console.log("body :>> ", body);
		try {
			const user = await this.service.joinWorkspace(body, this.options);
			return respondSuccess({ data: user });
		} catch (e) {
			console.log(e);
			return respondFailure({ msg: `Failed to join a workspace: ${e.message}` });
		}
	}

	/**
	 * Update user's access permissions
	 * @param body - Example: `{ userId: "000", resource: { "projects": "1,2,3,4", "apps": "4,5,6" } }`
	 * @returns
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/permissions")
	async updateAccessPermissions(
		@Body()
		body: {
			/**
			 * User slug
			 */
			userSlug: string;
			/**
			 * Resource data:
			 * - "name": `projects`, `apps`, `clusters`, `databases`, `database_backups`, `gits`, `frameworks`, `container_registries`
			 * - "value": List of resource IDs in string, separated by commas without spacing. For example: `123,456,789`
			 * @example { projects: "1,2,3", apps: "5,6,7" }
			 */
			resource: { [name: string]: string };
		}
	) {
		try {
			if (!body.userSlug) throw new Error(`Param "userSlug" is required.`);
			if (!body.resource) throw new Error(`Param "resource" is required.`);

			const { userSlug, resource } = body;
			const updatedUser = await this.service.updateAccessPermissions(userSlug, resource);

			return respondSuccess({ data: updatedUser });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}
}
