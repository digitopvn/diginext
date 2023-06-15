import { Body, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { respondFailure, respondSuccess } from "@/interfaces";
import exportPdf, { ExportPDFOptions } from "@/modules/capture/export-pdf";
import screenshot, { CaptureScreenshotOptions } from "@/modules/capture/screenshot";
import MediaService from "@/services/MediaService";

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
		if (!this.filter.url) return respondFailure(`Param "url" is required.`);

		// process
		try {
			const result = await exportPdf(this.filter.url, { ...body });
			if (!result) return respondFailure(`Something wrong...`);

			// success -> write to db
			delete result.buffer;
			const mediaSvc = new MediaService();
			const media = await mediaSvc.create(result);

			return respondSuccess({ data: media });
		} catch (e) {
			return respondFailure(`Internal server error: ${e}`);
		}
	}

	/**
	 * Capture a webpage and export to PDF
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/capture-screenshot")
	async captureScreenshot(@Body() body: CaptureScreenshotOptions, @Queries() queryParams?: { url: string }) {
		if (!this.filter.url) return respondFailure(`Param "url" is required.`);

		// process
		try {
			const result = await screenshot(this.filter.url, { ...body });
			if (!result) return respondFailure(`Something wrong...`);

			// success -> write to db
			delete result.buffer;
			const mediaSvc = new MediaService();
			const media = await mediaSvc.create(result);

			return respondSuccess({ data: media });
		} catch (e) {
			return respondFailure(`Internal server error: ${e}`);
		}
	}
}
