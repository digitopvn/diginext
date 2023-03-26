import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

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

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: Omit<Role, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<Role, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
