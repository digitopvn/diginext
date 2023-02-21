import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { Team } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import TeamService from "@/services/TeamService";

import BaseController from "./BaseController";

@Tags("Team")
@Route("team")
export default class TeamController extends BaseController<Team> {
	constructor() {
		super(new TeamService());
	}

	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("jwt")
	@Post("/")
	create(@Body() body: Omit<Team, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<Team, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
