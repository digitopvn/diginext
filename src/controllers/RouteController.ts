import { Get, Queries, Route, Security, Tags } from "tsoa/dist";

import type { User } from "@/entities";
import type RouteEntity from "@/entities/Route";
import { IGetQueryParams } from "@/interfaces";
import RouteService from "@/services/RouteService";

import BaseController from "./BaseController";

@Tags("Route")
@Route("route")
export default class RouteController extends BaseController<RouteEntity> {
	user: User;

	constructor() {
		super(new RouteService());
	}

	/**
	 * Get all routes
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}
}
