import { ObjectId } from "mongodb";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import BaseController from "@/controllers/BaseController";
import type { Role, User, Workspace } from "@/entities";
import type { HiddenBodyKeys, ResponseData } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import { isObjectId } from "@/plugins/mongodb";
import UserService from "@/services/UserService";
import WorkspaceService from "@/services/WorkspaceService";

interface JoinWorkspaceBody {
	userId: string;
	workspace: string;
}

@Tags("User")
@Route("user")
export default class UserController extends BaseController<User> {
	constructor() {
		super(new UserService());
	}

	filterRole(list: User[] = []) {
		const wsId = this.workspace._id.toString();
		return list.map((item) => {
			if (item.roles && item.roles.length > 0) {
				item.roles = item.roles.filter(async (role) => {
					let _role: Role;
					if (isObjectId(role)) _role = await DB.findOne<Role>("role", { _id: role });
					if (!_role) return false;
					return _role.workspace.toString() === wsId;
				});
			}
			if (item.workspaces && item.workspaces.length > 0) {
				item.workspaces = item.workspaces.filter(async (ws) => (ws as Workspace)._id?.toString() === wsId || ws.toString() === wsId);
			}
			return item;
		});
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: IGetQueryParams) {
		const wsId = this.workspace._id.toString();

		const list = await super.read();
		list.data = this.filterRole(list.data);

		return list;
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: Omit<User, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<User, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
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
		[updatedUser] = this.filterRole([updatedUser]);

		return respondSuccess({ data: updatedUser });
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/join-workspace")
	async joinWorkspace(@Body() data: JoinWorkspaceBody) {
		const { userId, workspace: workspaceSlug } = data;
		const result: ResponseData & { data: User } = { status: 1, messages: [], data: {} };
		// console.log("{ userId, workspace } :>> ", { userId, workspace });

		try {
			if (!userId) throw new Error(`"userId" is required.`);
			if (!workspaceSlug) throw new Error(`"workspaceSlug" is required.`);
			// console.log("===========");
			// console.log("userId, workspaceSlug :>> ", userId, workspaceSlug);

			const workspaceSvc = new WorkspaceService();
			const workspace = await workspaceSvc.findOne({ slug: workspaceSlug });

			if (!workspace) throw new Error(`Workspace "${workspaceSlug}" not found.`);
			// console.log("workspace :>> ", workspace);

			const wsId = workspace._id.toString();
			const user = await this.service.findOne({ id: new ObjectId(userId) });
			// console.log("user :>> ", user);
			// console.log("wsId :>> ", wsId);

			// validations
			if (!user) throw new Error(`User not found.`);
			if (!workspace.public) throw new Error(`This workspace is private, you need to ask the administrator to add you in first.`);

			let updatedUser = [user];

			const isUserJoinedThisWorkspace = (user.workspaces || []).map((id) => id.toString()).includes(wsId);
			// console.log("isUserJoinedThisWorkspace :>> ", isUserJoinedThisWorkspace);

			const isWorkspaceActive = typeof user.activeWorkspace !== "undefined" && user.activeWorkspace.toString() === wsId;
			// console.log("isWorkspaceActive :>> ", isWorkspaceActive);

			// console.log("user.workspaces :>> ", user.workspaces);
			if (!isUserJoinedThisWorkspace) {
				updatedUser = await this.service.update({ _id: userId }, { $push: { workspaces: workspace._id } }, { raw: true });
			}
			// console.log("[1] updatedUser :>> ", updatedUser[0]);

			// make this workspace active
			if (!isWorkspaceActive) updatedUser = await this.service.update({ _id: userId }, { activeWorkspace: wsId });

			// console.log("[2] updatedUser :>> ", updatedUser[0]);

			result.data = updatedUser[0];
		} catch (e) {
			result.messages.push(e.message);
			result.status = 0;
		}

		return result;
	}
}
