import { readFileSync, writeFileSync } from "fs";
import path from "path";

import { README_TEMPLATE_PATH } from "@/config/const";
import type { InputOptions } from "@/interfaces";
import { replaceInFile } from "@/plugins";

export async function createEmptyAppDirectory(options?: InputOptions) {
	const appDir = options?.targetDirectory;
	const readmePath = path.resolve(appDir, "README.md");
	const readmeContent = readFileSync(README_TEMPLATE_PATH, "utf8");
	writeFileSync(readmePath, readmeContent, "utf8");
	await replaceInFile(readmePath, [{ keyword: "{{repo_slug}}", replacement: options.repoSlug }]);
	return appDir;
}
