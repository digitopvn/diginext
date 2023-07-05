import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ICloudDatabaseBackup } from "@/entities";
import { CloudDatabaseBackupDto } from "@/entities";
import * as interfaces from "@/interfaces";
import { CloudDatabaseBackupService } from "@/services";

import BaseController from "./BaseController";

@Tags("Cloud Database Backup")
@Route("database-backup")
export default class CloudDatabaseBackupController extends BaseController<ICloudDatabaseBackup> {
	service: CloudDatabaseBackupService;

	constructor() {
		super(new CloudDatabaseBackupService());
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		console.log("this.filter :>> ", this.filter);
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: CloudDatabaseBackupDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		try {
			return await super.create(body);
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: CloudDatabaseBackupDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}
}
