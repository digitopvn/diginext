import { Body, Delete, Get, Patch, Post, Queries, Route, Tags } from "tsoa/dist";

import type { User } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { ObjectID } from "@/libs/typeorm";

import UserService from "../services/UserService";
import BaseController from "./BaseController";

interface JoinWorkspaceBody {
	userId: string;
	workspace: string;
}

@Tags("User")
@Route("user")
export default class UserController extends BaseController<User> {
	service: UserService;

	constructor() {
		super(new UserService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<User, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<User, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Patch("/join-workspace")
	async joinWorkspace(@Body() data: JoinWorkspaceBody) {
		const { userId, workspace } = data;
		const result: ResponseData & { data: User } = { status: 1, messages: [], data: {} };
		// console.log("{ userId, workspace } :>> ", { userId, workspace });

		try {
			const user = await this.service.joinWorkspace(new ObjectID(userId), workspace as string);
			result.data = user;
		} catch (e) {
			result.messages.push(e.message);
			result.status = 0;
		}

		return result;
	}
}
