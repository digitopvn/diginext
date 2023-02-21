import { Body, Delete, Get, Patch, Post, Queries, Route, Tags } from "tsoa/dist";

import type { Role } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import RoleService from "@/services/RoleService";

import BaseController from "./BaseController";

@Tags("Role")
@Route("role")
export default class RoleController extends BaseController<Role> {
	constructor() {
		super(new RoleService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<Role, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<Role, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
