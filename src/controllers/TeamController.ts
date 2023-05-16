import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ITeam } from "@/entities";
import { TeamDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import TeamService from "@/services/TeamService";

import BaseController from "./BaseController";

@Tags("Team")
@Route("team")
export default class TeamController extends BaseController<ITeam> {
	constructor() {
		super(new TeamService());
	}

	/**
	 * List of teams
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: TeamDto, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: TeamDto, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
