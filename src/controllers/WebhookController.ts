import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { IWebhook } from "@/entities/Webhook";
import * as interfaces from "@/interfaces";
import { WebhookService } from "@/services/WebhookService";

import BaseController from "./BaseController";

@Tags("Webhook")
@Route("webhook")
export default class WebhookController extends BaseController<IWebhook, WebhookService> {
	constructor() {
		super(new WebhookService());
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
	async create(@Body() body: IWebhook, @Queries() queryParams?: interfaces.IPostQueryParams) {
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
	async update(@Body() body: IWebhook, @Queries() queryParams?: interfaces.IPostQueryParams) {
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
