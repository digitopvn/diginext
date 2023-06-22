import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { CronjobRepeat, CronjobRequest, CronjonRepeatCondition, ICronjob } from "@/entities/Cronjob";
import type { HiddenBodyKeys } from "@/interfaces";
import * as interfaces from "@/interfaces";
import { cancelCronjobById } from "@/modules/cronjob/cancel-job";
import { createCronjobAtTime, createCronjobRepeat } from "@/modules/cronjob/schedule";
import { MongoDB } from "@/plugins/mongodb";
import type { CloudDatabase } from "@/services/CloudDatabaseService";
import CronjobService from "@/services/CronjobService";

import BaseController from "./BaseController";

@Tags("Cronjob")
@Route("cronjob")
export default class CronjobController extends BaseController<ICronjob> {
	service: CronjobService;

	constructor() {
		super(new CronjobService());
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
	async create(@Body() body: Omit<CloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: interfaces.IPostQueryParams) {
		try {
			const data = await this.service.create(body);
			return interfaces.respondSuccess({ data });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: Omit<CloudDatabase, keyof HiddenBodyKeys>, @Queries() queryParams?: interfaces.IPostQueryParams) {
		try {
			const data = await super.update(body);
			return interfaces.respondSuccess({ data });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}

	/**
	 * Schedule a cronjob to be executed at a specific time
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/schedule-at")
	async scheduleAt(
		@Body()
		body: {
			/**
			 * Name
			 */
			name: string;
			/**
			 * HTTP Request information
			 */
			request: CronjobRequest;
			/**
			 * Scheduled time of the cronjob
			 */
			time: Date;
		},
		@Queries() queryParams?: interfaces.IPostQueryParams
	) {
		try {
			const data = await createCronjobAtTime(body.name, body.request, body.time, {
				owner: MongoDB.toString(this.user._id),
				workspace: MongoDB.toString(this.workspace._id),
			});

			return interfaces.respondSuccess({ data });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}

	/**
	 * Schedule a cronjob to be executed repeatedly
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/schedule-repeat")
	async scheduleRepeat(
		@Body()
		body: {
			/**
			 * Name
			 */
			name: string;
			/**
			 * HTTP Request information
			 */
			request: CronjobRequest;
			/**
			 * Recurrent job configuration
			 */
			repeat: CronjobRepeat;
			/**
			 * Recurrent job's conditions
			 */
			condition: CronjonRepeatCondition;
		},
		@Queries() queryParams?: interfaces.IPostQueryParams
	) {
		try {
			const data = await createCronjobRepeat(body.name, body.request, body.repeat, body.condition, {
				owner: MongoDB.toString(this.user._id),
				workspace: MongoDB.toString(this.workspace._id),
			});

			return interfaces.respondSuccess({ data });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}

	/**
	 * Cancel a cronjob
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/cancel")
	async cancelCronjob(@Body() body: {}, @Queries() queryParams?: { id: string }) {
		try {
			const data = await cancelCronjobById(this.filter._id);
			return interfaces.respondSuccess({ data });
		} catch (e) {
			return interfaces.respondFailure(e.toString());
		}
	}
}
