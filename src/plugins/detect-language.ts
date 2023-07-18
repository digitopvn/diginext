import { existsSync } from "fs";
import * as fs from "fs";
import * as path from "path";

export const supportedLanguages = ["javascript", "typescript", "golang", "python", "rust", "php", "java"] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const detectLanguage = (dir: string) => {
	if (!existsSync(dir)) throw new Error(`Directory is not existed.`);

	const files = fs.readdirSync(dir);

	const languageMap: { [extension: string]: SupportedLanguage } = {
		".js": "javascript",
		".ts": "typescript",
		".go": "golang",
		".py": "python",
		".rs": "rust",
		".php": "php",
		".java": "java",
	};

	const detectedLanguages: SupportedLanguage[] = [];

	files.forEach((file) => {
		const extension = path.extname(file);
		const language = languageMap[extension];
		if (language && !detectedLanguages.includes(language)) {
			detectedLanguages.push(language);
		}
	});

	return detectedLanguages;
};
