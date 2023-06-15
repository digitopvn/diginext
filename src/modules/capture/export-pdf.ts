import type { PaperFormat, PDFMargin, Viewport } from "puppeteer";
import puppeteer from "puppeteer";

export type ExportPDFOptions = {
	viewport?: Viewport;
	printBackground?: boolean;
	path?: string;
	format?: PaperFormat;
	scale?: number;
	margin?: PDFMargin;
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
	format: "A4",
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

	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: _options.viewport,
		executablePath: process.env.CHROMIUM_PATH,
		args: ["--no-sandbox"],
	});
	const page = await browser.newPage();

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

	// res.contentType("application/pdf");
	// res.send(pdfBuffer);
	return { buffer: pdfBuffer, mime: "application/pdf" };
};

export default exportPdf;
