import type { ScreenshotOptions, Viewport } from "puppeteer";
import puppeteer from "puppeteer";

const defaultExportPdfOptions: ScreenshotOptions & { viewport?: Viewport } = {
	viewport: { width: 1400, height: 900 },
	path: "../public/screenshots/screen.png",
	type: "png",
	fullPage: true,
	encoding: "binary",
};

const screenshot = async (url: string, options: ScreenshotOptions = defaultExportPdfOptions) => {
	if (!url) throw new Error("URL parameter is missing.");

	const _options = { ...defaultExportPdfOptions, ...options };
	const { viewport, ...screenshotOptions } = _options;

	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: viewport,
		executablePath: process.env.CHROMIUM_PATH,
		args: ["--no-sandbox"],
	});
	const page = await browser.newPage();

	// disable cache...
	await page.setCacheEnabled(false);

	await page.goto(url, {
		waitUntil: "networkidle0",
	});

	const buffer = await page.screenshot(screenshotOptions);

	await page.close();
	await browser.close();

	// res.contentType("application/pdf");
	// res.send(pdfBuffer);
	return { buffer, mime: "image/png" };
};

export default screenshot;
