import { Body, Delete, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IUser, IWorkspace } from "@/entities";
import { EnvVarDto, IEnvVar } from "@/entities/EnvVar";
import { type IQueryFilter, type IQueryOptions, type IResponsePagination, IDeleteQueryParams, IPostQueryParams } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import { EnvVarService } from "@/services/EnvVarService";

import BaseController from "./BaseController";
// import { DeployEnvironmentService } from "@/services/DeployEnvironmentService";

@Tags("EnvVarController")
@Route("env-var")
export default class EnvVarController extends BaseController<IEnvVar, EnvVarService> {
	user: IUser;

	workspace: IWorkspace;

	ownership: Ownership;

	filter: IQueryFilter;

	options: IQueryOptions;

	pagination: IResponsePagination;

	service: EnvVarService;

	constructor() {
		super(new EnvVarService());
	}

	/**
	 * Get list of env vars
	 */
	// @Security("api_key")
	// @Security("jwt")
	// @Get("/")
	// async read(
	// 	@Queries()
	// 	queryParams: {
	// 		appId?: string;
	// 		projectId?: string;
	// 		workspaceId?: string;
	// 		env?: string;
	// 	}
	// ) {
	// 	return super.read();
	// }

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: IEnvVar) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: EnvVarDto, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
