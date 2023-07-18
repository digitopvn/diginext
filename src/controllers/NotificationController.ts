import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { INotification } from "@/entities/Notification";
import * as interfaces from "@/interfaces";
import { NotificationService } from "@/services/NotificationService";

import BaseController from "./BaseController";

@Tags("Notification")
@Route("notification")
export default class NotificationController extends BaseController<INotification, NotificationService> {
	constructor() {
		super(new NotificationService());
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
	async create(@Body() body: INotification, @Queries() queryParams?: interfaces.IPostQueryParams) {
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
	async update(@Body() body: INotification, @Queries() queryParams?: interfaces.IPostQueryParams) {
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
}
