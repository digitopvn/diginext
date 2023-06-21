import { isEmpty } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IRole } from "@/entities";
import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import RoleService from "@/services/RoleService";

import BaseController from "./BaseController";

@Tags("Role")
@Route("role")
export default class RoleController extends BaseController<IRole> {
	constructor() {
		super(new RoleService());
	}

	/**
	 * List of roles
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
	async create(@Body() body: entities.RoleDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		// validation
		if (!body.name) return interfaces.respondFailure({ msg: `Name of role is required.` });
		if (isEmpty(body.routes)) return interfaces.respondFailure({ msg: `List of routes is required.` });

		// TODO: no one can create "Administrator" and "Member" role

		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: entities.RoleDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	async delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		// Can't delete default roles: Administrator, Moderator & Member
		const tobeDeletedItems = await this.service.find(this.filter);

		if (tobeDeletedItems && tobeDeletedItems.length > 0) {
			const defaultRoles = tobeDeletedItems.filter((item) => item.type === "admin" || item.type === "member" || item.type === "moderator");
			if (defaultRoles.length > 0)
				return interfaces.respondFailure({ msg: `Default roles (${defaultRoles.map((r) => r.name).join(", ")}) can't be deleted.` });
		}

		return super.delete();
	}
}
