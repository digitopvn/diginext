import { isEmpty } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { Role } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure } from "@/interfaces";
import RoleService from "@/services/RoleService";

import BaseController from "./BaseController";

export type RoleDto = Omit<Role, keyof HiddenBodyKeys>;

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
	async create(@Body() body: RoleDto, @Queries() queryParams?: IPostQueryParams) {
		// validation
		if (!body.name) return respondFailure({ msg: `Name of role is required.` });
		if (isEmpty(body.routes)) return respondFailure({ msg: `List of routes is required.` });

		// TODO: no one can create "Administrator" and "Member" role

		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: RoleDto, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	async delete(@Queries() queryParams?: IDeleteQueryParams) {
		// Can't delete default roles: Administrator, Moderator & Member
		const tobeDeletedItems = await this.service.find(this.filter);

		if (tobeDeletedItems && tobeDeletedItems.length > 0) {
			const defaultRoles = tobeDeletedItems.filter((item) => item.type === "admin" || item.type === "member" || item.type === "moderator");
			if (defaultRoles.length > 0)
				return respondFailure({ msg: `Default roles can't be deleted: ${defaultRoles.map((r) => r.name).join(", ")}` });
		}

		return super.delete();
	}
}
