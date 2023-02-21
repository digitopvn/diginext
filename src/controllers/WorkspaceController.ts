import { Body, Delete, Get, Patch, Post, Queries, Route, Tags } from "tsoa/dist";

import type { User, Workspace } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import WorkspaceService from "@/services/WorkspaceService";

import BaseController from "./BaseController";

interface AddUserBody {
	userId: string;
	workspaceId: string;
}

@Tags("Workspace")
@Route("workspace")
export default class WorkspaceController extends BaseController<Workspace> {
	service: WorkspaceService;

	constructor() {
		const service = new WorkspaceService();
		super(service);
		this.service = service;
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<Workspace, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<Workspace, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Patch("/add-user")
	async addUser(@Body() data: AddUserBody) {
		const { userId, workspaceId } = data;
		const result: ResponseData & { data: User[] } = { status: 1, messages: [], data: [] };

		try {
			const users = await this.service.addUser(userId as string, workspaceId as string);
			result.data = users;
		} catch (e) {
			result.messages.push(e.message);
			result.status = 0;
		}

		return result;
	}
}
