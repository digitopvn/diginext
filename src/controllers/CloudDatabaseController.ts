import { Body, Delete, Get, Patch, Post, Queries } from "tsoa/dist";

import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { CloudDatabase } from "@/services/CloudDatabaseService";
import CloudDatabaseService from "@/services/CloudDatabaseService";

import BaseController from "./BaseController";

export default class CloudDatabaseController extends BaseController<CloudDatabase> {
	constructor() {
		super(new CloudDatabaseService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<CloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<CloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
