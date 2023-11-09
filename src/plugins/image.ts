import axios from "axios";
import { readFileSync, writeFileSync } from "fs";
import sizeOf from "image-size";
import path from "path";

export function readFileToBuffer(filePath: string) {
	const _path = path.resolve(filePath);
	try {
		const buffer = readFileSync(_path);
		return buffer;
	} catch (err) {
		throw new Error(`Error reading file from path ${filePath}: ${err.message}`);
	}
}

/**
 * Read image url and convert to {Buffer}
 */
export async function getImageBufferFromUrl(url: string) {
	try {
		const response = await axios.get(url, { responseType: "arraybuffer" });
		return Buffer.from(response.data);
	} catch (error) {
		console.error("Error fetching the image:", error);
		return;
	}
}

/**
 * Download image from input URL
 */
export async function downloadImage(url: string, outputPath: string) {
	try {
		const response = await axios.get(url, {
			responseType: "arraybuffer",
		});

		writeFileSync(outputPath, response.data);
		// console.log(`Image downloaded and saved to ${outputPath}`);
		return outputPath;
	} catch (error) {
		console.error("Error downloading the image:", error);
		return;
	}
}

/**
 * Get image's dimentions (width, height)
 * @param url - Input image URL
 */
export async function getImageDimensions(url: string) {
	try {
		const buffer = await getImageBufferFromUrl(url);
		if (!buffer) throw new Error(`Unable to read image from url.`);
		const dimensions = sizeOf(buffer);
		return dimensions;
	} catch (error) {
		console.error("Error fetching the image:", error);
		return null;
	}
}
