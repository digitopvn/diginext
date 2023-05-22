import { Body, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { IPostQueryParams, respondFailure } from "@/interfaces";
import { CreateDiginextDomainParams, createDxDomain } from "@/modules/diginext/dx-domain";

import BaseController from "./BaseController";

@Tags("Domain")
@Route("domain")
export default class DomainController extends BaseController {
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

		const dxKey = this.workspace.dx_key;
		// process
		const res = await createDxDomain(body, dxKey);
		return res;
	}
}
