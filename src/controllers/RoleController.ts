import { isEmpty } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { Role, User } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import { DB } from "@/modules/api/DB";
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
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		// TODO: can't delete default roles: Administrator & Member
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/assign")
	async assign(
		@Body()
		body: {
			userId: string;
			roleId: string;
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		// validation
		if (!body.userId) return respondFailure({ msg: `User ID is required.` });
		if (!body.roleId) return respondFailure({ msg: `Role ID is required.` });

		const role = await DB.findOne<Role>("role", { _id: body.roleId });
		if (!role) return respondFailure({ msg: `Role not found.` });

		const [user] = await DB.update<User>("user", { _id: body.userId }, { $addToSet: { roles: role._id } }, { raw: true });

		return respondSuccess({ data: { role, user } });
	}
}
