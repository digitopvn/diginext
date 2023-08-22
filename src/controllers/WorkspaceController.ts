import { isUndefined } from "lodash";
import type { Types } from "mongoose";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { Config } from "@/app.config";
import BaseController from "@/controllers/BaseController";
import type { IApiKeyAccount, IRole, IServiceAccount, IWorkspace } from "@/entities";
import type { ResponseData } from "@/interfaces";
import * as interfaces from "@/interfaces";
import { dxSendEmail } from "@/modules/diginext/dx-email";
import type { DxPackage } from "@/modules/diginext/dx-package";
import { dxGetPackages, dxSubscribe } from "@/modules/diginext/dx-package";
import type { DxSubsription } from "@/modules/diginext/dx-subscription";
import { dxCreateWorkspace } from "@/modules/diginext/dx-workspace";
import { filterUniqueItems } from "@/plugins/array";
import { MongoDB } from "@/plugins/mongodb";
import { addUserToWorkspace, makeWorkspaceActive } from "@/plugins/user-utils";
import seedWorkspaceInitialData from "@/seeds";
import { RoleService, UserService, WorkspaceService } from "@/services";

interface AddUserBody {
	userId: Types.ObjectId;
	workspaceId: Types.ObjectId;
	roleId?: Types.ObjectId;
}

export type CreateWorkspaceParams = {
	name: string;
	type?: "default" | "hobby" | "self_hosted";
	packageId: string;
	userId: any;
	email: string;
	public: boolean;
};

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
		let pkgId: string;
		// if no "dx_key" provided, subscribe to a DX package & obtain DX key
		if (!dx_key) {
			const pkgRes = await dxGetPackages();
			if (!pkgRes || !pkgRes.status)
				return interfaces.respondFailure(pkgRes.messages?.join(", ") || `Unable to get the list of Diginext package plans.`);

			const dxPackages = pkgRes.data as DxPackage[];
			const pkg = dxPackages.find((p) => (Config.SERVER_TYPE === "hobby" ? "hobby" : "self_hosted"));
			if (!pkg) return interfaces.respondFailure(`Diginext package plans not found.`);
			pkgId = pkg.id;
			const subscribeRes = await dxSubscribe({ email: this.user.email });
			if (!subscribeRes || !subscribeRes.status)
				return interfaces.respondFailure(
					subscribeRes.messages?.join(", ") || `Unable to subscribe a Diginext package "${pkg.name}" (${pkg.id}).`
				);

			const dxSubscription = subscribeRes.data as DxSubsription;

			dx_key = dxSubscription.key;
			console.log("dxSubscription >>>>>>>>", dxSubscription);

			if (!dx_key) return interfaces.respondFailure(`Unable to obtain "dx_key" from Diginext Package Subscribe API.`);

			body.dx_key = dx_key;
		}

		// find owner
		let ownerUser = this.user;
		if (!ownerUser) return interfaces.respondFailure("Workspace's owner not found.");

		// Assign some default values if it's missing
		if (isUndefined(body.public)) body.public = true;

		// ----- VERIFY DX KEY -----
		// Create workspace in diginext-site
		const dataCreateWorkSpace: CreateWorkspaceParams = {
			name: name,
			email: ownerUser.email,
			packageId: pkgId,
			userId: ownerUser._id,
			public: body.public,
		};
		const createWsRes = await dxCreateWorkspace(dataCreateWorkSpace, dx_key);
		if (!createWsRes.status) return interfaces.respondFailure(`Unable to create Diginext workspace: ${createWsRes.messages.join(".")}`);

		// ----- END VERIFYING -----

		// [1] Create new workspace:
		if (this.options?.isDebugging) console.log("WorkspaceController > CREATE > body :>> ", body);
		const newWorkspace = await this.service.create(body);
		if (this.options?.isDebugging) console.log("WorkspaceController > CREATE > ownerUser :>> ", ownerUser);
		if (this.options?.isDebugging) console.log("WorkspaceController > CREATE > newWorkspace :>> ", newWorkspace);
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
				let existingUser = await DB.findOne("user", { email });
				if (!existingUser) {
					const username = email.split("@")[0] || "New User";
					const invitedMember = await DB.create("user", { name: username, email: email, workspaces: [wsId], roles: [memberRole._id] });
					return invitedMember;
				} else {
					const workspaces = existingUser.workspaces || [];
					workspaces.push(wsId);
					existingUser = await DB.updateOne("user", { _id: existingUser._id }, { workspaces: filterUniqueItems(workspaces) });
					return existingUser;
				}
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
			const userSvc = new UserService(this.ownership);
			const roleSvc = new RoleService(this.ownership);

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
		queryParams?: {
			/**
			 * ID of Service Account
			 */
			id?: string;
		}
	) {
		const { DB } = await import("@/modules/api/DB");
		const workspaceID = this.ownership.workspace._id;

		let data: IServiceAccount | IServiceAccount[] = this.filter.id
			? await DB.findOne("service_account", { _id: this.filter.id, workspaces: { $in: [workspaceID] } })
			: await DB.find("service_account", { workspaces: { $in: [workspaceID] } });

		return interfaces.respondSuccess({ data });
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
		queryParams?: {
			/**
			 * ID of API key account
			 */
			id?: string;
		}
	) {
		const { DB } = await import("@/modules/api/DB");
		const workspaceID = this.ownership.workspace._id;

		let data: IApiKeyAccount | IApiKeyAccount[] = this.filter.id
			? await DB.findOne("api_key_user", { _id: this.filter.id, workspaces: { $in: [workspaceID] } })
			: await DB.find("api_key_user", { workspaces: { $in: [workspaceID] } });

		return interfaces.respondSuccess({ data });
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/update-package")
	async updatePackageWorkspace(@Body() data: { workspaceId: string; dx_key: string }) {
		const { DB } = await import("@/modules/api/DB");
		const workspace = await this.service.findOne({ id: data.workspaceId });
		if (!workspace) throw new Error(`This workspace is not existed.`);

		const workspaceUpdate = await DB.updateOne("workspace", { id: data.workspaceId }, { dx_key: data.dx_key });
		return interfaces.respondSuccess({ data: { workspaceUpdate } });
	}
}
