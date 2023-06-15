import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { Body, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { Config } from "@/app.config";
import { CLI_DIR } from "@/config/const";
import { respondFailure, respondSuccess } from "@/interfaces";
import exportPdf, { ExportPDFOptions } from "@/modules/capture/export-pdf";
import screenshot, { CaptureScreenshotOptions } from "@/modules/capture/screenshot";

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
		const dir = path.resolve(CLI_DIR, "public/upload/pdf");
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

		const fileName = `webpage-${makeDaySlug({ divider: "" })}.pdf`;
		const filePath = path.resolve(dir, fileName);
		const fileUrl = `${Config.BASE_URL}/upload/pdf/${fileName}`;

		try {
			const result = await exportPdf(this.filter.url, { ...body, path: filePath });
			if (!result) return respondFailure(`Something wrong...`);
			return respondSuccess({ data: { url: fileUrl, mimetype: result.mime } });
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
		if (!body.type) body.type = "png";

		// process
		const dir = path.resolve(CLI_DIR, "public/upload/screenshot");
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

		const fileName = `screenshot-${makeDaySlug({ divider: "" })}.${body.type}`;
		const filePath = path.resolve(dir, fileName);
		const fileUrl = `${Config.BASE_URL}/upload/screenshot/${fileName}`;

		try {
			const result = await screenshot(this.filter.url, { ...body, path: filePath });
			if (!result) return respondFailure(`Something wrong...`);
			return respondSuccess({ data: { url: fileUrl, mimetype: result.mime } });
		} catch (e) {
			return respondFailure(`Internal server error: ${e}`);
		}
	}
}
