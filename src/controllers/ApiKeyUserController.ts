import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import BaseController from "@/controllers/BaseController";
import type { IApiKeyAccount } from "@/entities/ApiKeyAccount";
import * as ApiKeyAccount from "@/entities/ApiKeyAccount";
import * as interfaces from "@/interfaces";
import { ApiKeyUserService } from "@/services";
import WorkspaceService from "@/services/WorkspaceService";

interface JoinWorkspaceBody {
	userId: string;
	workspace: string;
}

@Tags("API Key")
@Route("api_key")
export default class ApiKeyUserController extends BaseController<IApiKeyAccount> {
	constructor() {
		super(new ApiKeyUserService());
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: ApiKeyAccount.ApiKeyAccountDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: ApiKeyAccount.ApiKeyAccountDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/join-workspace")
	async joinWorkspace(@Body() data: JoinWorkspaceBody) {
		const { userId, workspace: workspaceSlug } = data;
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

			const wsId = workspace._id;
			const user = await this.service.findOne({ id: userId });
			// console.log("user :>> ", user);
			// console.log("wsId :>> ", wsId);

			// validations
			if (!user) throw new Error(`User not found.`);
			if (!workspace.public) throw new Error(`This workspace is private, you need to ask the administrator to add you in first.`);

			let updatedUser = user;

			const isUserJoinedThisWorkspace = (user.workspaces || []).includes(wsId);
			// console.log("isUserJoinedThisWorkspace :>> ", isUserJoinedThisWorkspace);

			const isWorkspaceActive = typeof user.activeWorkspace !== "undefined" && user.activeWorkspace === wsId;
			// console.log("isWorkspaceActive :>> ", isWorkspaceActive);

			// console.log("user.workspaces :>> ", user.workspaces);
			if (!isUserJoinedThisWorkspace) {
				[updatedUser] = await this.service.update({ _id: userId }, { $push: { workspaces: workspace._id } }, { raw: true });
			}
			// console.log("[1] updatedUser :>> ", updatedUser[0]);

			// make this workspace active
			if (!isWorkspaceActive) [updatedUser] = await this.service.update({ _id: userId }, { activeWorkspace: wsId });

			// console.log("[2] updatedUser :>> ", updatedUser[0]);

			return interfaces.respondSuccess({ data: updatedUser });
		} catch (e) {
			return interfaces.respondFailure(e.message);
		}
	}
}