import { isUndefined } from "lodash";
import type { Types } from "mongoose";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { Config, IsTest } from "@/app.config";
import BaseController from "@/controllers/BaseController";
import type { IRole, IUser, IWorkspace } from "@/entities";
import type { IGetQueryParams, ResponseData } from "@/interfaces";
import * as interfaces from "@/interfaces";
import { dxSendEmail } from "@/modules/diginext/dx-email";
import type { DxPackage } from "@/modules/diginext/dx-package";
import { dxGetPackages, dxSubscribe } from "@/modules/diginext/dx-package";
import type { DxSubsription } from "@/modules/diginext/dx-subscription";
import { dxCreateWorkspace } from "@/modules/diginext/dx-workspace";
import { isValidObjectId, MongoDB } from "@/plugins/mongodb";
import { addUserToWorkspace, makeWorkspaceActive } from "@/plugins/user-utils";
import seedWorkspaceInitialData from "@/seeds";
import { RoleService, UserService, WorkspaceService } from "@/services";

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
	 * User ID of the owner (default is the current authenticated user)
	 */
	owner?: string;
	/**
	 * Set privacy mode for this workspace
	 * @default true
	 */
	public?: boolean;
	/**
	 * Diginext API Key
	 */
	dx_key: string;
}

@Tags("Workspace")
@Route("workspace")
export default class WorkspaceController extends BaseController<IWorkspace> {
	// service: WorkspaceService;

	constructor() {
		super(new WorkspaceService());
	}

	/**
	 * List of workspaces
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: WorkspaceInputData) {
		const { owner = MongoDB.toString(this.user._id), name } = body;

		if (!name) return interfaces.respondFailure({ msg: `Param "name" is required.` });
		if (!owner) return interfaces.respondFailure({ msg: `Param "owner" (UserID) is required.` });

		let dx_key: string = body.dx_key;

		// if no "dx_key" provided, subscribe to a DX package & obtain DX key
		if (!dx_key) {
			const pkgRes = await dxGetPackages();
			if (!pkgRes || !pkgRes.status)
				return interfaces.respondFailure(pkgRes.messages?.join(", ") || `Unable to get the list of Diginext package plans.`);

			const dxPackages = pkgRes.data as DxPackage[];
			const pkg = dxPackages.find((p) => (Config.SERVER_TYPE === "hobby" ? "hobby" : "self_hosted"));
			if (!pkg) return interfaces.respondFailure(`Diginext package plans not found.`);

			const subscribeRes = await dxSubscribe({ userEmail: this.user.email, packageId: pkg.id });
			if (!subscribeRes || !subscribeRes.status)
				return interfaces.respondFailure(
					subscribeRes.messages?.join(", ") || `Unable to subscribe a Diginext package "${pkg.name}" (${pkg.id}).`
				);

			const dxSubscription = subscribeRes.data as DxSubsription;
			dx_key = dxSubscription.key;
			if (!dx_key) return interfaces.respondFailure(`Unable to obtain "dx_key" from Diginext Package Subscribe API.`);

			body.dx_key = dx_key;
		}

		// find owner
		let ownerUser = this.user;
		if (!ownerUser) return interfaces.respondFailure("Workspace's owner not found.");

		// Assign some default values if it's missing
		if (isUndefined(body.public)) body.public = true;

		// ----- VERIFY DX KEY -----

		// console.log("Config.SERVER_TYPE :>> ", Config.SERVER_TYPE);
		// skip checking DX key for unit test
		if (!IsTest()) {
			const createWsRes = await dxCreateWorkspace({ name, type: Config.SERVER_TYPE }, dx_key);
			// console.log("createWsRes :>> ", createWsRes);
			if (!createWsRes.status) return interfaces.respondFailure(`Unable to create Diginext workspace: ${createWsRes.messages.join(".")}`);
		}

		// ----- END VERIFYING -----

		// [1] Create new workspace:
		console.log("WorkspaceController > CREATE > body :>> ", body);
		const newWorkspace = await this.service.create(body);
		console.log("WorkspaceController > CREATE > ownerUser :>> ", ownerUser);
		console.log("WorkspaceController > CREATE > newWorkspace :>> ", newWorkspace);
		if (!newWorkspace) return interfaces.respondFailure(`Failed to create new workspace.`);

		/**
		 * [2] SEED INITIAL DATA TO THIS WORKSPACE
		 * - Default roles
		 * - Default permissions of routes
		 * - Default API_KEY
		 * - Default Service Account
		 * - Default Frameworks
		 * - Default Clusters (if any)
		 */
		await seedWorkspaceInitialData(newWorkspace, ownerUser);

		// [3] Ownership: add this workspace to the creator {User} if it's not existed:
		ownerUser = await addUserToWorkspace(owner, newWorkspace, "admin");

		// [4] Set this workspace as "activeWorkspace" for this creator:
		ownerUser = await makeWorkspaceActive(owner, MongoDB.toString(newWorkspace._id));

		return interfaces.respondSuccess({ data: newWorkspace });
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: WorkspaceInputData, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	async delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		const { DB } = await import("@/modules/api/DB");
		// delete workspace in user:
		const _user = await DB.findOne("user", { workspaces: this.workspace._id });
		const workspaces = _user.workspaces.filter((wsId) => MongoDB.toString(wsId) !== MongoDB.toString(this.workspace._id));
		const updatedUser = await DB.updateOne("user", { _id: _user._id }, { workspaces, activeWorkspace: undefined });
		console.log("[WorkspaceController] delete > updatedUser :>> ", updatedUser);

		// delete related data:
		await DB.delete("project", { workspace: this.workspace._id });
		await DB.delete("app", { workspace: this.workspace._id });
		await DB.delete("build", { workspace: this.workspace._id });
		await DB.delete("cluster", { workspace: this.workspace._id });
		await DB.delete("framework", { workspace: this.workspace._id });
		await DB.delete("git", { workspace: this.workspace._id });
		await DB.delete("database", { workspace: this.workspace._id });
		await DB.delete("api_key_user", { workspace: this.workspace._id });
		await DB.delete("service_account", { workspace: this.workspace._id });
		await DB.delete("registry", { workspace: this.workspace._id });
		await DB.delete("release", { workspace: this.workspace._id });
		await DB.delete("role", { workspace: this.workspace._id });
		await DB.delete("route", { workspace: this.workspace._id });
		await DB.delete("team", { workspace: this.workspace._id });
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/invite")
	async inviteMember(@Body() data: { emails: string[] }) {
		if (!data.emails || data.emails.length === 0) return interfaces.respondFailure({ msg: `List of email is required.` });
		if (!this.user) return interfaces.respondFailure({ msg: `Unauthenticated.` });
		const { DB } = await import("@/modules/api/DB");

		const { emails } = data;

		const workspace = this.user.activeWorkspace as IWorkspace;
		const wsId = workspace._id;
		const userId = this.user._id;

		// check if this user is admin of the workspace:
		const activeRole = this.user.activeRole as IRole;
		if (activeRole.type !== "admin" && activeRole.type !== "moderator") return interfaces.respondFailure(`Unauthorized.`);

		const memberRole = await DB.findOne("role", { type: "member", workspace: wsId });

		// create temporary users of invited members:
		const invitedMembers = await Promise.all(
			emails.map(async (email) => {
				const invitedMember = await DB.create("user", { email: email, workspaces: [wsId], roles: [memberRole._id] });
				return invitedMember;
			})
		);

		const mailContent = `Dear,<br/><br/>You've been invited to <strong>"${workspace.name}"</strong> workspace, please <a href="${Config.BASE_URL}" target="_blank">click here</a> to login.<br/><br/>Cheers,<br/>Diginext System`;

		// send invitation email to those users:
		const result = await dxSendEmail(
			{
				recipients: invitedMembers.map((member) => {
					return { email: member.email };
				}),
				subject: `[DIGINEXT] "${this.user.name}" has invited you to join "${workspace.name}" workspace.`,
				content: mailContent,
			},
			workspace.dx_key
		);

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
		const { DB } = await import("@/modules/api/DB");
		const { workspace } = this.filter;
		if (!workspace) return interfaces.respondFailure({ msg: `Workspace ID or slug is required.` });

		let serviceAccounts: IUser[] = [];
		if (isValidObjectId(workspace)) {
			serviceAccounts = await DB.find("service_account", { workspaces: { $in: [workspace] } });
		} else {
			const ws = await DB.findOne("workspace", { slug: workspace });
			if (!ws) return interfaces.respondFailure({ msg: `Workspace not found.` });
			serviceAccounts = await DB.find("service_account", { workspaces: { $in: [ws._id] } });
		}

		return interfaces.respondSuccess({ data: serviceAccounts });
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
		const { DB } = await import("@/modules/api/DB");
		const { workspace } = this.filter;
		if (!workspace) return interfaces.respondFailure({ msg: `Workspace ID or slug is required.` });

		let list: IUser[] = [];
		if (isValidObjectId(workspace)) {
			list = await DB.find("api_key_user", { workspaces: { $in: [workspace] } });
		} else {
			const ws = await DB.findOne("workspace", { slug: workspace });
			if (!ws) return interfaces.respondFailure({ msg: `Workspace not found.` });
			list = await DB.find("api_key_user", { workspaces: { $in: [ws._id] } });
		}

		return interfaces.respondSuccess({ data: list });
	}
}
