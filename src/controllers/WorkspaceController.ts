import { isUndefined } from "lodash";
import type { Types } from "mongoose";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { Config } from "@/app.config";
import BaseController from "@/controllers/BaseController";
import type { IRole, IUser, IWorkspace } from "@/entities";
import type { ResponseData } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import { sendDiginextEmail } from "@/modules/diginext/dx-email";
import { isValidObjectId, MongoDB } from "@/plugins/mongodb";
import { addUserToWorkspace, makeWorkspaceActive } from "@/plugins/user-utils";
import seedWorkspaceInitialData from "@/seeds";
import { RoleService, UserService } from "@/services";
import WorkspaceService from "@/services/WorkspaceService";

interface AddUserBody {
	userId: Types.ObjectId;
	workspaceId: Types.ObjectId;
	roleId?: Types.ObjectId;
}

interface ApiUserAndServiceAccountQueries extends IGetQueryParams {
	/**
	 * Workspace ID or slug
	 */
	workspace: Types.ObjectId | string;
}

interface WorkspaceInputData {
	/**
	 * Name of the workspace.
	 */
	name: string;
	/**
	 * User ID of the owner
	 */
	owner: string;
	/**
	 * Set privacy mode for this workspace
	 * @default true
	 */
	public?: boolean;
}

@Tags("Workspace")
@Route("workspace")
export default class WorkspaceController extends BaseController<IWorkspace> {
	// service: WorkspaceService;

	constructor() {
		super(new WorkspaceService());
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: WorkspaceInputData) {
		const { owner = MongoDB.toString(this.user._id), name } = body;

		if (!name) return respondFailure({ msg: `Workspace "name" is required.` });
		if (!owner) return respondFailure({ msg: `Workspace "owner" (UserID) is required.` });

		// find owner
		let ownerUser = await DB.findOne<IUser>("user", { _id: owner });
		if (!ownerUser) return respondFailure("Workspace's owner not found.");

		// Assign some default values if it's missing
		if (isUndefined(body.public)) body.public = true;

		// [1] Create new workspace:
		// console.log("createWorkspace > body :>> ", body);
		const newWorkspace = await this.service.create(body);
		// console.log("createWorkspace > newWorkspace :>> ", newWorkspace);
		if (!newWorkspace) return respondFailure(`Failed to create new workspace.`);

		/**
		 * [2] SEED INITIAL DATA TO THIS WORKSPACE
		 * - Default roles
		 * - Default permissions of routes
		 * - Default API_KEY
		 * - Default Service Account
		 * - Default Frameworks
		 */
		await seedWorkspaceInitialData(newWorkspace, ownerUser);

		// [3] Ownership: add this workspace to the creator {User} if it's not existed:
		ownerUser = await addUserToWorkspace(owner, newWorkspace, "admin");
		console.log(`Added "${ownerUser.name}" user to workspace "${newWorkspace.name}".`);

		// [4] Set this workspace as "activeWorkspace" for this creator:
		ownerUser = await makeWorkspaceActive(owner, MongoDB.toString(newWorkspace._id));
		console.log(`Made workspace "${newWorkspace.name}" active for "${ownerUser.name}" user.`);

		return respondSuccess({ data: newWorkspace });
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: WorkspaceInputData, @Queries() queryParams?: IPostQueryParams) {
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
	@Post("/invite")
	async inviteMember(@Body() data: { emails: string[] }) {
		if (!data.emails || data.emails.length === 0) return respondFailure({ msg: `List of email is required.` });
		if (!this.user) return respondFailure({ msg: `Unauthenticated.` });

		const { emails } = data;

		const workspace = this.user.activeWorkspace as IWorkspace;
		const wsId = workspace._id;
		const userId = this.user._id;

		// check if this user is admin of the workspace:
		const activeRole = this.user.activeRole as IRole;
		if (activeRole.type !== "admin" && activeRole.type !== "moderator") return respondFailure(`Unauthorized.`);

		const memberRole = await DB.findOne<IRole>("role", { type: "member", workspace: wsId });

		// create temporary users of invited members:
		const invitedMembers = await Promise.all(
			emails.map(async (email) => {
				const invitedMember = await DB.create<IUser>("user", { email: email, workspaces: [wsId], roles: [memberRole._id] });
				return invitedMember;
			})
		);

		const mailContent = `Dear,<br/><br/>You've been invited to <strong>"${workspace.name}"</strong> workspace, please <a href="${Config.BASE_URL}" target="_blank">click here</a> to login.<br/><br/>Cheers,<br/>Diginext System`;

		// send invitation email to those users:
		const result = await sendDiginextEmail({
			recipients: invitedMembers.map((member) => {
				return { email: member.email };
			}),
			subject: `[DIGINEXT] "${this.user.name}" has invited you to join "${workspace.name}" workspace.`,
			content: mailContent,
		});

		return result;
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/add-user")
	async addUser(@Body() data: AddUserBody) {
		const { userId, workspaceId, roleId } = data;
		const result: ResponseData = { status: 1, messages: [], data: [] };

		try {
			const uid = userId;
			const wsId = workspaceId;
			const userSvc = new UserService();
			const roleSvc = new RoleService();

			const user = await userSvc.findOne({ id: uid });
			const workspace = await this.service.findOne({ id: wsId });

			let role: IRole;
			if (roleId) role = await roleSvc.findOne({ id: roleId });

			if (!user) throw new Error(`This user is not existed.`);
			if (!workspace) throw new Error(`This workspace is not existed.`);
			if (user.workspaces.includes(wsId)) throw new Error(`This user is existed in this workspace.`);

			const workspaces = [...user.workspaces, wsId].filter((_wsId) => typeof _wsId !== "undefined").map((_wsId) => MongoDB.toString(_wsId));

			const updatedUser = await userSvc.update({ id: uid }, { workspaces });

			result.data = updatedUser;
		} catch (e) {
			result.messages.push(e.message);
			result.status = 0;
		}

		return result;
	}

	/**
	 * ======================= SERVICE ACCOUNT ======================
	 */

	/**
	 * Get Service Account list of a workspace
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/service_account")
	async getServiceAccounts(
		@Queries()
		queryParams?: ApiUserAndServiceAccountQueries
	) {
		const { workspace } = this.filter;
		if (!workspace) return respondFailure({ msg: `Workspace ID or slug is required.` });

		let serviceAccounts: IUser[] = [];
		if (isValidObjectId(workspace)) {
			serviceAccounts = await DB.find<IUser>("service_account", { workspaces: { $in: [workspace] } });
		} else {
			const ws = await DB.findOne<IWorkspace>("workspace", { slug: workspace });
			if (!ws) return respondFailure({ msg: `Workspace not found.` });
			serviceAccounts = await DB.find<IUser>("service_account", { workspaces: { $in: [ws._id] } });
		}

		return respondSuccess({ data: serviceAccounts });
	}

	/**
	 * ======================= API KEY USER ACCOUNT ======================
	 */

	/**
	 * Get Service Account list of a workspace
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/api_key")
	async getApiKeyUsers(
		@Queries()
		queryParams?: ApiUserAndServiceAccountQueries
	) {
		const { workspace } = this.filter;
		if (!workspace) return respondFailure({ msg: `Workspace ID or slug is required.` });

		let list: IUser[] = [];
		if (isValidObjectId(workspace)) {
			list = await DB.find<IUser>("api_key_user", { workspaces: { $in: [workspace] } });
		} else {
			const ws = await DB.findOne<IWorkspace>("workspace", { slug: workspace });
			if (!ws) return respondFailure({ msg: `Workspace not found.` });
			list = await DB.find<IUser>("api_key_user", { workspaces: { $in: [ws._id] } });
		}

		return respondSuccess({ data: list });
	}
}
