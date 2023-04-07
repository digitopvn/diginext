import { isArray, isEmpty } from "lodash";
import type { ObjectId } from "mongodb";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import BaseController from "@/controllers/BaseController";
import type { Role, User } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import { toObjectId } from "@/plugins/mongodb";
import { filterRole, filterSensitiveInfo } from "@/plugins/user-utils";
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
			res.data = await filterRole(this.workspace._id.toString(), res.data);
			res.data = filterSensitiveInfo(res.data);
		} else {
			res.data = await filterRole(this.workspace._id.toString(), [res.data]);
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
	create(@Body() body: Omit<User, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: Omit<User, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		if (body.roles) {
			const roleId = body.roles;
			const oldRoles = this.user.roles.filter((role) => (role as Role).workspace.toString() === this.workspace._id.toString());

			const newRole = await DB.findOne<Role>("role", { _id: roleId });
			const newRoles = [
				...this.user.roles.filter((role) => !oldRoles.map((r) => (r as Role)._id.toString()).includes((role as Role)._id.toString())),
				newRole,
			];

			const newRoleIds = newRoles.map((role) => (role as Role)._id);

			body.roles = newRoleIds;
		}
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
	async assignRole(@Body() data: { roleId: string }) {
		if (!data.roleId) return respondFailure({ msg: `Role ID is required.` });
		if (!this.user) return respondFailure({ msg: `User not found.` });

		const { roleId } = data;
		const currentRoles = this.user.roles.filter((role) => (role as Role).workspace.toString() === this.workspace._id.toString());
		const prevRole = currentRoles[0] as Role;

		const newRole = await DB.findOne<Role>("role", { _id: roleId });
		const newRoles = [...this.user.roles.filter((role) => (role as Role)._id.toString() !== prevRole._id.toString()), newRole];
		const newRoleIds = newRoles.map((role) => (role as Role)._id);

		let [updatedUser] = await DB.update<User>(
			"user",
			{ _id: this.user._id },
			{ roles: newRoleIds },
			{ populate: ["roles", "workspaces", "activeWorkspace"] }
		);
		if (!updatedUser) return respondFailure({ msg: `Failed to assign "${newRole.name}" role to "${this.user.slug}" user.` });

		// filter roles & workspaces before returning
		[updatedUser] = await filterRole(this.workspace._id.toString(), [updatedUser]);

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
			const userId = toObjectId(uid);
			const workspaceId = toObjectId(workspaceIdOrSlug); // return undefined if can't convert to ObjectId -> it's a slug!!! (lol)
			const workspaceSlug = !workspaceId ? workspaceIdOrSlug : undefined;

			const wsFilter: any = {};
			if (workspaceId) wsFilter._id = workspaceId;
			if (workspaceSlug) wsFilter.slug = workspaceSlug;

			// find the workspace
			const workspaceSvc = new WorkspaceService();
			const workspace = await workspaceSvc.findOne(wsFilter);
			if (!workspace) throw new Error(`Workspace not found.`);
			// console.log("workspace :>> ", workspace);

			// find the user
			let user = await this.service.findOne({ _id: userId, workspaces: workspaceId });
			if (!user) throw new Error(`User not found.`);

			const wsId = workspaceId.toString();
			const workspaceIds = (user.workspaces as ObjectId[]) || [];
			const isUserInWorkspace = workspaceIds.map((_id) => _id.toString()).includes(wsId);

			// add this workspace to user's workspace list
			if (!isUserInWorkspace) workspaceIds.push(workspaceId);

			// check if this is a private workspace:
			if (!workspace.public) {
				// if this user hasn't joined yet:
				if (!isUserInWorkspace) throw new Error(`This workspace is private, you need an invitation to access.`);
			}

			// set default roles if this user doesn't have one
			const memberRole = await DB.findOne<Role>("role", { type: "member", workspace: workspaceId });
			const userRoles = user.roles || [];
			if (isEmpty(userRoles) || !userRoles.map((_id) => _id.toString()).includes(memberRole._id.toString())) {
				userRoles.push(memberRole._id);
			}

			// set active workspace of this user -> this workspace
			[user] = await this.service.update(
				{ _id: userId },
				{ activeWorkspace: workspaceId, workspaces: workspaceIds, roles: userRoles },
				this.options
			);

			// return the updated user:
			return respondSuccess({ data: user });
		} catch (e) {
			console.log(e);
			return respondFailure({ msg: "Failed to join a workspace." });
		}
	}
}
