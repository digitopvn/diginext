import { Body, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import * as interfaces from "@/interfaces";
import * as dxDomain from "@/modules/diginext/dx-domain";

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
	async createDiginextDomain(@Body() body: dxDomain.CreateDiginextDomainParams, @Queries() queryParams?: interfaces.IPostQueryParams) {
		// validate
		if (!body.name) return interfaces.respondFailure({ msg: `Subdomain name is required.` });
		if (!body.data) return interfaces.respondFailure({ msg: `Value of A RECORD is required (usually the IP address).` });

		const dxKey = this.workspace.dx_key;
		// process
		const res = await dxDomain.dxCreateDomain(body, dxKey);
		return res;
	}
}
