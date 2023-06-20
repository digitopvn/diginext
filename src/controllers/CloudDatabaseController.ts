import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ICloudDatabase } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure } from "@/interfaces";
import type { CloudDatabase } from "@/services/CloudDatabaseService";
import CloudDatabaseService from "@/services/CloudDatabaseService";

import BaseController from "./BaseController";

@Tags("CloudDatabase")
@Route("database")
export default class CloudDatabaseController extends BaseController<ICloudDatabase> {
	service: CloudDatabaseService;

	constructor() {
		super(new CloudDatabaseService());
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
	async create(@Body() body: Omit<CloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		try {
			return await super.create(body);
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<CloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/healthz")
	async checkConnection(@Queries() queryParams?: IGetQueryParams) {
		try {
			const db = await this.service.findOne(this.filter);
			if (!db) return respondFailure(`Database not found.`);
			return await this.service.checkHealth(db);
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/backup")
	async backup(
		@Body()
		body: {
			/**
			 * `[OPTIONAL]`
			 * Backup name
			 */
			name?: string;
		},
		@Queries() queryParams?: IPostQueryParams
	) {
		try {
			const db = await this.service.findOne(this.filter);
			if (!db) return respondFailure(`Database not found.`);
			return await this.service.backup(db);
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/restore")
	async restore(@Body() body: Omit<CloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		try {
			// restore...
			return respondFailure(`This feature is under development.`);
		} catch (e) {
			return respondFailure(e.toString());
		}
	}
}
