import { Body, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { User } from "@/entities";
import { IPostQueryParams, respondFailure } from "@/interfaces";
import { createDiginextDomain, CreateDiginextDomainParams } from "@/modules/diginext/dx-domain";

import BaseController from "./BaseController";

@Tags("Domain")
@Route("domain")
export default class DomainController extends BaseController {
	user: User;

	/**
	 * Create new Diginext domain
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async createDiginextDomain(@Body() body: CreateDiginextDomainParams, @Queries() queryParams?: IPostQueryParams) {
		// validate
		if (!body.name) return respondFailure({ msg: `Subdomain name is required.` });
		if (!body.data) return respondFailure({ msg: `Value of A RECORD is required (usually the IP address).` });

		// process
		const res = await createDiginextDomain(body);
		return res;
	}
}
