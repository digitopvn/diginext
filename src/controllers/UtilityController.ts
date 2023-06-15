import { Body, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { respondSuccess } from "@/interfaces";
import exportPdf, { ExportPDFOptions } from "@/modules/capture/export-pdf";

import BaseController from "./BaseController";

@Tags("Utility")
@Route("utility")
export default class UtilityController extends BaseController {
	/**
	 * Capture a webpage and export to PDF
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/export-pdf")
	async exportWebpagePDF(@Body() body: ExportPDFOptions, @Queries() queryParams?: { url: string }) {
		// process
		const buffer = exportPdf(this.filter.url, body);
		return respondSuccess({ data: buffer });
	}
}
