import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import BaseController from "@/controllers/BaseController";
import type { IApiKeyAccount, IServiceAccount, IWorkspace } from "@/entities";
import * as interfaces from "@/interfaces";
import { AddUserToWorkspaceParams, InviteMemberData, WorkspaceInputData, WorkspaceService } from "@/services/WorkspaceService";

@Tags("Workspace")
@Route("workspace")
export default class WorkspaceController extends BaseController<IWorkspace> {
	service: WorkspaceService;

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
		try {
			const newWorkspace = await this.service.create(body);
			return interfaces.respondSuccess({ data: newWorkspace });
		} catch (e) {
			return interfaces.respondFailure(e);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: Partial<WorkspaceInputData>, @Queries() queryParams?: interfaces.IPostQueryParams) {
		try {
			const updatedWorkspace = await this.service.update(this.filter, body, this.options);
			return interfaces.respondSuccess({ data: updatedWorkspace });
		} catch (e) {
			return interfaces.respondFailure(e);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	async delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		try {
			const deletedWorkspace = await this.service.delete(this.filter, this.options);
			return interfaces.respondSuccess({ data: deletedWorkspace });
		} catch (e) {
			return interfaces.respondFailure(e);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/invite")
	async inviteMember(
		@Body()
		data: InviteMemberData
	) {
		try {
			const result = await this.service.inviteMember(data, this.options);
			return interfaces.respondSuccess({ data: result });
		} catch (e) {
			return interfaces.respondFailure(e);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/add-user")
	async addUser(@Body() data: AddUserToWorkspaceParams) {
		try {
			const updatedUser = await this.service.addUser(data);
			return interfaces.respondSuccess({ data: updatedUser });
		} catch (e) {
			return interfaces.respondFailure(e);
		}
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
	async updatePackageWorkspace(@Body() data: { old_key: string; new_key: string }) {
		const { DB } = await import("@/modules/api/DB");
		const workspace = await this.service.findOne({ dx_key: data.old_key });
		if (!workspace) throw new Error(`This workspace is not existed.`);
		const workspaceUpdate = await DB.updateOne("workspace", { dx_key: data.old_key }, { dx_key: data.new_key });
		return interfaces.respondSuccess({ data: { workspaceUpdate } });
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/is-owner-workspace")
	async isOwnerWorkspace(@Body() data: { userId: string; workspace_id: string }) {
		console.log("Is onwer workspace", data);
		const result = await this.service.findOne({ owner: data.userId, _id: data.workspace_id });
		if (!result) throw new Error(`This is not the owner of workspace.`);

		return interfaces.respondSuccess({ data: { result } });
	}
}
