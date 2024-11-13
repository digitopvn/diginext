import { Body, Delete, Get, Patch, Path, Post, Queries, Route, Security, Tags } from "tsoa/dist";

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
		if (!body.userId) body.userId = this.user.dxUserId;

		// process
		const res = await dxDomain.dxCreateDomain(body, dxKey);
		return res;
	}

	/**
	 * Get all Diginext domains
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async getDiginextDomains() {
		const dxKey = this.workspace.dx_key;
		const res = await dxDomain.dxGetDomains(dxKey);
		return res;
	}

	/**
	 * Get all Diginext domain records
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/records")
	async getDiginextDomainRecords(@Queries() queryParams?: { isDebugging?: boolean }) {
		const dxKey = this.workspace.dx_key;
		console.log("OPTIONS :>>", this.options);
		console.log("DEBUGGING :>>", this.options.isDebugging);
		console.log("DXKEY :>>", dxKey);
		const res = await dxDomain.dxGetAllDomainRecords(dxKey, { isDebugging: this.options.isDebugging });
		return res;
	}

	/**
	 * Get a Diginext domain record by name
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/records/:recordName")
	async getDiginextDomainRecordByName(@Path() recordName: string, @Queries() queryParams?: { type?: string }) {
		// Detailed debugging
		console.log("DomainController > Debug > Raw Inputs :>>", {
			pathParams: this.req.params,
			routeParams: this.req?.route?.params,
			recordName,
			queryParams,
		});

		// Explicit extraction and validation
		const extractedRecordName = this.req.params?.recordName || (typeof recordName === "string" ? recordName : undefined);

		if (!extractedRecordName) {
			throw new Error(`Invalid or missing recordName. Received: ${JSON.stringify(recordName)}`);
		}

		const dxKey = this.workspace.dx_key;
		const type = queryParams?.type || this.filter?.type || "A";
		const res = await dxDomain.dxGetDomainRecordByName({ name: extractedRecordName, type }, dxKey);
		return res;
	}

	/**
	 * Update a Diginext domain record
	 */
	@Security("api_key")
	@Security("jwt")
	@Patch("/records/:recordName")
	async updateDiginextDomainRecord(
		@Path() recordName: string,
		@Body() body: dxDomain.UpdateDiginextDomainData,
		@Queries() queryParams?: { type?: string }
	) {
		// Explicit extraction and validation
		const extractedRecordName = this.req.params?.recordName || (typeof recordName === "string" ? recordName : undefined);

		if (!extractedRecordName) {
			throw new Error(`Invalid or missing recordName. Received: ${JSON.stringify(recordName)}`);
		}
		console.log("BODY :>>", this.req.body);

		const dxKey = this.workspace.dx_key;
		const type = queryParams?.type || this.filter?.type || "A";
		const res = await dxDomain.dxUpdateDomainRecord({ name: extractedRecordName, type }, this.req.body, dxKey);
		return res;
	}

	/**
	 * Delete a Diginext domain record
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/records/:recordName")
	async deleteDiginextDomainRecord(@Path() recordName: string, @Queries() queryParams?: { type?: string }) {
		// Explicit extraction and validation
		const extractedRecordName = this.req.params?.recordName || (typeof recordName === "string" ? recordName : undefined);

		if (!extractedRecordName) {
			throw new Error(`Invalid or missing recordName. Received: ${JSON.stringify(recordName)}`);
		}

		const dxKey = this.workspace.dx_key;
		const res = await dxDomain.dxDeleteDomainRecord({ name: extractedRecordName, type: queryParams?.type || "A" }, dxKey);
		return res;
	}
}
