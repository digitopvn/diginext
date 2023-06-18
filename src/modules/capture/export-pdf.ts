import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import puppeteer from "puppeteer";

import { Config } from "@/app.config";
import { CLI_DIR } from "@/config/const";

export type ExportPDFOptions = {
	viewport?: {
		/**
		 * The page width in pixels.
		 */
		width: number;
		/**
		 * The page height in pixels.
		 */
		height: number;
		/**
		 * Specify device scale factor.
		 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio | devicePixelRatio} for more info.
		 *
		 * @remarks
		 * Setting this value to `0` will set the deviceScaleFactor to the system default.
		 *
		 * @defaultValue `1`
		 */
		deviceScaleFactor?: number;
		/**
		 * Whether the `meta viewport` tag is taken into account.
		 * @defaultValue `false`
		 */
		isMobile?: boolean;
		/**
		 * Specifies if the viewport is in landscape mode.
		 * @defaultValue `false`
		 */
		isLandscape?: boolean;
		/**
		 * Specify if the viewport supports touch events.
		 * @defaultValue `false`
		 */
		hasTouch?: boolean;
	};
	printBackground?: boolean;
	path?: string;
	format?: "letter" | "legal" | "tabloid" | "ledger" | "a0" | "a1" | "a2" | "a3" | "a4" | "a5" | "a6";
	scale?: number;
	margin?: {
		top?: string | number;
		bottom?: string | number;
		left?: string | number;
		right?: string | number;
	};
	displayHeaderFooter?: boolean;
	/**
	 * Hides default white background and allows generating pdfs with transparency.
	 * @defaultValue `false`
	 */
	omitBackground?: boolean;
};

const defaultExportPdfOptions: ExportPDFOptions = {
	viewport: { width: 1400, height: 900 },
	printBackground: true,
	path: "../public/pdf/webpage.pdf",
	format: "a4",
	scale: 1,
	margin: {
		top: "20px",
		bottom: "40px",
		left: "20px",
		right: "20px",
	},
	displayHeaderFooter: false,
	omitBackground: false,
};

const exportPdf = async (url: string, options: ExportPDFOptions = defaultExportPdfOptions) => {
	if (!url) throw new Error("URL parameter is missing.");

	const _options = { ...defaultExportPdfOptions, ...options };

	// upload directory
	const dir = path.resolve(CLI_DIR, "public/upload/pdf");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	const fileName = `webpage-${makeDaySlug({ divider: "" })}.pdf`;
	const filePath = path.resolve(dir, fileName);
	const fileUrl = `${Config.BASE_URL}/upload/pdf/${fileName}`;

	_options.path = filePath;

	const browser = await puppeteer.launch({
		headless: "new",
		defaultViewport: _options.viewport,
		executablePath: "/usr/bin/chromium",
		// executablePath: process.env.CHROMIUM_PATH,
		args: ["--no-sandbox"],
	});
	const page = await browser.newPage();

	try {
		// disable cache...
		await page.setCacheEnabled(false);

		await page.goto(url, {
			waitUntil: "networkidle0",
		});

		const pdfBuffer = await page.pdf({
			printBackground: _options.printBackground,
			path: _options.path,
			format: _options.format,
			scale: _options.scale,
			margin: _options.margin,
			displayHeaderFooter: _options.displayHeaderFooter,
			omitBackground: _options.omitBackground,
		});

		await page.close();
		await browser.close();

		if (!pdfBuffer) return;

		// res.contentType("application/pdf");
		// res.send(pdfBuffer);
		return { name: fileName, path: filePath, url: fileUrl, buffer: pdfBuffer, mime: "application/pdf" };
	} catch (e) {
		throw new Error(`Unable to export PDF of "${url}": ${e}`);
	} finally {
		await page.close();
		await browser.close();
	}
};

export default exportPdf;
