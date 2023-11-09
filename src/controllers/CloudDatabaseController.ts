import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { ICloudDatabase } from "@/entities";
import { CloudDatabaseBackupDto } from "@/entities";
import type { CronjobRepeat, CronjonRepeatCondition } from "@/entities/Cronjob";
import type { HiddenBodyKeys } from "@/interfaces";
import * as interfaces from "@/interfaces";
import { MongoDB } from "@/plugins/mongodb";
import { CloudDatabaseService } from "@/services/CloudDatabaseService";

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
	read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: Omit<ICloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: interfaces.IPostQueryParams) {
		try {
			return await super.create(body);
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<ICloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: interfaces.IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/healthz")
	async checkConnection(@Queries() queryParams?: interfaces.IGetQueryParams) {
		try {
			const db = await this.service.findOne(this.filter);
			if (!db) return interfaces.respondFailure(`Database not found.`);
			const success = await this.service.checkHealth(db);
			return interfaces.respondSuccess({ data: { success } });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
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
		@Queries()
		queryParams?: {
			/**
			 * Cloud Database ID
			 */
			id: string;
		}
	) {
		try {
			const db = await this.service.findOne(this.filter);
			if (!db) return interfaces.respondFailure(`Database not found.`);
			const data = await this.service.backup(db);
			return interfaces.respondSuccess({ data });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/restore")
	async restore(
		@Body() body: CloudDatabaseBackupDto,
		@Queries()
		queryParams?: {
			/**
			 * Cloud Database Backup ID
			 */
			id: string;
		}
	) {
		try {
			// restore...
			return interfaces.respondFailure(`This feature is under development.`);
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/auto-backup")
	async scheduleAutoBackup(
		@Body()
		body: {
			/**
			 * Recurrent job's configuration
			 */
			repeat?: CronjobRepeat;
			/**
			 * Recurrent job's conditions
			 */
			condition?: CronjonRepeatCondition;
		},
		@Queries() queryParams?: { _id: string }
	) {
		// default values: run backup cronjob at 2AM everyday
		if (!body.repeat) body.repeat = {};
		if (!body.repeat.range) body.repeat.range = 1;
		if (!body.repeat.unit) body.repeat.unit = "day";
		if (!body.condition) body.condition = {};
		if (!body.condition.atHours) body.condition.atHours = [2];

		try {
			const data = await this.service.scheduleAutoBackup(this.filter._id, body.repeat, body.condition, {
				owner: MongoDB.toString(this.user._id),
				workspace: MongoDB.toString(this.workspace._id),
			});

			return interfaces.respondSuccess({ data });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}
}
