import type { ScreenshotOptions, Viewport } from "puppeteer";
import puppeteer from "puppeteer";

export type CaptureScreenshotOptions = {
	/**
	 * @default png
	 */
	type?: "png" | "jpeg" | "webp";
	/**
	 * The file path to save the image to. The screenshot type will be inferred
	 * from file extension. If path is a relative path, then it is resolved
	 * relative to current working directory. If no path is provided, the image
	 * won't be saved to the disk.
	 */
	path?: string;
	/**
	 * When `true`, takes a screenshot of the full page.
	 * @default false
	 */
	fullPage?: boolean;
	/**
	 * An object which specifies the clipping region of the page.
	 */
	clip?: {
		x: number;
		y: number;
		width: number;
		height: number;
		/**
		 * @default 1
		 */
		scale?: number;
	};
	/**
	 * Quality of the image, between 0-100. Not applicable to `png` images.
	 */
	quality?: number;
	/**
	 * Hides default white background and allows capturing screenshots with transparency.
	 * @default false
	 */
	omitBackground?: boolean;
	/**
	 * Encoding of the image.
	 * @default binary
	 */
	encoding?: "base64" | "binary";
	/**
	 * Capture the screenshot beyond the viewport.
	 * @default true
	 */
	captureBeyondViewport?: boolean;
	/**
	 * Capture the screenshot from the surface, rather than the view.
	 * @default true
	 */
	fromSurface?: boolean;
};

const defaultExportPdfOptions: CaptureScreenshotOptions & { viewport?: Viewport } = {
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
		headless: "new",
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

	if (!buffer) return;

	// res.contentType("application/pdf");
	// res.send(pdfBuffer);
	return { buffer, mime: "image/png" };
};

export default screenshot;
