import { logError } from "diginext-utils/dist/console/log";
import fs from "fs";
import path from "path";

import type { InputOptions } from "@/interfaces/InputOptions";
import { DIGINEST_GITIGNORE_TEMPLATE_PATH, DIGINEXT_GITIGNORE_TEMPLATE_PATH, GENERAL_GITIGNORE_TEMPLATE } from "@/main";
import { getCurrentFramework } from "@/plugins";

/**
 * Setup "gitignore" for new application
 */

export const setupGitIgnore = (options: InputOptions) => {
	const fw = options.framework || getCurrentFramework(options);

	try {
		let gitignoreTemplatePath = GENERAL_GITIGNORE_TEMPLATE;

		if (fw == "diginest") {
			gitignoreTemplatePath = DIGINEST_GITIGNORE_TEMPLATE_PATH;
		} else if (fw == "diginext") {
			gitignoreTemplatePath = DIGINEXT_GITIGNORE_TEMPLATE_PATH;
		}

		const gitIgnoreContent = fs.readFileSync(gitignoreTemplatePath, "utf8");
		const gitignoreWritePath = path.resolve(options.targetDirectory, ".gitignore");
		fs.writeFileSync(gitignoreWritePath, gitIgnoreContent, "utf8");
	} catch (e) {
		logError("[GITIGNORE]", e);
	}
};
