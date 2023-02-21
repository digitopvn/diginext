import { Body, Delete, Get, Patch, Post, Queries } from "tsoa/dist";

import type { Framework } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import FrameworkService from "@/services/FrameworkService";

import BaseController from "./BaseController";

export default class FrameworkController extends BaseController<Framework> {
	constructor() {
		super(new FrameworkService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<Framework, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<Framework, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}
}
