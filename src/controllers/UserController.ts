import { isArray, isEmpty } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import BaseController from "@/controllers/BaseController";
import type { Role, User } from "@/entities";
import { UserDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import type { ObjectID } from "@/libs/typeorm";
import { DB } from "@/modules/api/DB";
import { MongoDB, toObjectID } from "@/plugins/mongodb";
import { addRoleToUser, filterRole, filterSensitiveInfo } from "@/plugins/user-utils";
import UserService from "@/services/UserService";
import WorkspaceService from "@/services/WorkspaceService";

interface JoinWorkspaceBody {
	/**
	 * User ID
	 */
	userId: string;
	/**
	 * Workspace's ID or slug
	 */
	workspace: string;
}

@Tags("User")
@Route("user")
export default class UserController extends BaseController<User> {
	service: UserService;

	constructor() {
		super(new UserService());
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: IGetQueryParams) {
		const res = await super.read();

		// console.log("[1] res.data :>> ", res.data);
		if (isArray(res.data)) {
			res.data = await filterRole(MongoDB.toString(this.workspace._id), res.data);
			res.data = filterSensitiveInfo(res.data);
		} else {
			res.data = await filterRole(MongoDB.toString(this.workspace._id), [res.data]);
			res.data = filterSensitiveInfo([res.data]);
		}
		// console.log("[2] res.data :>> ", res.data);
		return res;
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/profile")
	profile(@Queries() queryParams?: IGetQueryParams) {
		return this.user;
	}

	@Security("api_key2")
	@Security("jwt")
	@Post("/")
	create(@Body() body: UserDto, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: UserDto, @Queries() queryParams?: IPostQueryParams) {
		if (body.roles) {
			const roleId = body.roles;
			const oldRoles = this.user.roles.filter((role) => MongoDB.toString((role as Role).workspace) === MongoDB.toString(this.workspace._id));

			const newRole = await DB.findOne<Role>("role", { _id: roleId });
			const newRoles = [
				...this.user.roles.filter(
					(role) => !oldRoles.map((r) => MongoDB.toString((r as Role)._id)).includes(MongoDB.toString((role as Role)._id))
				),
				newRole,
			];

			const newRoleIds = newRoles.map((role) => (role as Role)._id);

			body.roles = newRoleIds;
		}

		// console.log("this.filter :>> ", this.filter);

		// [MAGIC] if the item to be updated is the current logged in user -> allow it to happen!
		if (this.filter.owner && MongoDB.toString(this.filter.owner) === MongoDB.toString(this.user._id)) delete this.filter.owner;

		return super.update(body);
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
	async assignRole(@Body() data: { roleId: ObjectID }) {
		if (!data.roleId) return respondFailure({ msg: `Role ID is required.` });
		if (!this.user) return respondFailure({ msg: `User not found.` });

		const { roleId } = data;

		const newRole = await DB.findOne<Role>("role", { _id: roleId });
		const roleType = newRole.type as "admin" | "moderator" | "member";

		// add role to user
		let updatedUser = await addRoleToUser(roleType, MongoDB.toObjectID(this.user._id), this.workspace);

		// filter roles & workspaces before returning
		[updatedUser] = await filterRole(MongoDB.toString(this.workspace._id), [updatedUser]);

		return respondSuccess({ data: updatedUser });
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/join-workspace")
	async joinWorkspace(@Body() body: JoinWorkspaceBody) {
		// console.log("body :>> ", body);
		const { userId: uid, workspace: workspaceIdOrSlug } = body;

		try {
			if (!uid) throw new Error(`Param "userId" (User ID) is required.`);
			if (!workspaceIdOrSlug) throw new Error(`Param "workspace" (Workspace ID or slug) is required.`);

			// parse input params
			const userId = toObjectID(uid);

			// workspace in query could be "_id" and also "slug":
			let workspaceId = toObjectID(workspaceIdOrSlug); // return undefined if can't convert to "ObjectID" -> it's a "slug" !!! (lol)
			let workspaceSlug = !workspaceId ? workspaceIdOrSlug : undefined;

			if (!workspaceId && !workspaceSlug) return respondFailure(`Param "workspace" (ID or SLUG) is invalid`);

			const wsFilter: any = {};
			if (workspaceId) wsFilter._id = workspaceId;
			if (workspaceSlug) wsFilter.slug = workspaceSlug;

			// find the workspace
			const workspaceSvc = new WorkspaceService();
			const workspace = await workspaceSvc.findOne(wsFilter);
			if (!workspace) throw new Error(`Workspace not found.`);

			workspaceId = toObjectID(workspace._id);

			// find the user
			let user = await this.service.findOne({ _id: userId, workspaces: workspaceId });
			if (!user) throw new Error(`User not found.`);

			const wsId = MongoDB.toString(workspaceId);
			const workspaceIds = (user.workspaces as ObjectID[]) || [];
			const isUserInWorkspace = workspaceIds.map((_id) => MongoDB.toString(_id)).includes(wsId);

			// add this workspace to user's workspace list
			if (!isUserInWorkspace) workspaceIds.push(workspaceId);

			// check if this is a private workspace:
			if (!workspace.public) {
				// if this user hasn't joined yet:
				if (!isUserInWorkspace) throw new Error(`This workspace is private, you need an invitation to access.`);
			}

			// set default roles if this user doesn't have one
			const memberRole = await DB.findOne<Role>("role", { type: "member", workspace: workspaceId });
			const roles = user.roles || [];
			if (isEmpty(roles) || !roles.map((_id) => MongoDB.toString(_id)).includes(MongoDB.toString(memberRole._id))) roles.push(memberRole._id);

			// set active workspace of this user -> this workspace
			[user] = await this.service.update({ _id: userId }, { activeWorkspace: workspaceId, workspaces: workspaceIds, roles }, this.options);

			// return the updated user:
			return respondSuccess({ data: user });
		} catch (e) {
			console.log(e);
			return respondFailure({ msg: "Failed to join a workspace." });
		}
	}
}
