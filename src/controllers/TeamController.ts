import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ITeam } from "@/entities";
import * as entities from "@/entities";
import * as interfaces from "@/interfaces";
import { TeamService } from "@/services";

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
	read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: entities.TeamDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: entities.TeamDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}
}
