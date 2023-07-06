import * as fs from "fs";
import path from "path";

import type { SupportedLanguage } from "./detect-language";

export function findVersion(language: SupportedLanguage) {
	let filePath: string;
	switch (language) {
		case "javascript":
		case "typescript":
			// Check within JavaScript/TypeScript source code
			filePath = "package.json";
			if (!fs.existsSync(path.resolve(filePath))) return "1.0.0";
			const fileContent = fs.readFileSync(filePath, "utf-8");
			const versionRegex = /version\s*:\s*["']([^"']+)["']/;
			const match = fileContent.match(versionRegex);
			return match ? match[1] : undefined;

		case "golang":
			// Check within Go source code
			const goVersionRegex = /version\s*=\s*"([^"]+)"/;
			const goMatch = fs.readFileSync(filePath, "utf-8").match(goVersionRegex);
			return goMatch ? goMatch[1] : undefined;

		case "rust":
			// Check within Rust source code
			const rustVersionRegex = /version\s*=\s*"([^"]+)"/;
			const rustMatch = fs.readFileSync(filePath, "utf-8").match(rustVersionRegex);
			return rustMatch ? rustMatch[1] : undefined;

		case "python":
		case "php":
		case "java":
			// These languages don't have version extraction logic yet
			return undefined;

		default:
			return undefined;
	}
}
