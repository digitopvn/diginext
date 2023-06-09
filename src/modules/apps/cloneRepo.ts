import { logError } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import path from "path";

import type { InputOptions } from "@/interfaces";
import selectApp from "@/modules/apps/selectApp";
import selectProject from "@/modules/apps/selectProject";
import { pullingOldRepo } from "@/modules/framework";

//
export default async function cloneRepo(options: InputOptions) {
	options.project = await selectProject(options);
	options.app = await selectApp(options, false);
	//

	console.log("options :>> ", options);

	options.targetDirectory = path.resolve(process.cwd(), options.repoSlug);

	if (fs.existsSync(options.targetDirectory)) {
		if (options.overwrite) {
			fs.rmSync(options.targetDirectory, { recursive: true, force: true });
		} else {
			logError(`App directory with name "${options.slug}" was already existed.`);
			return;
		}
	}

	if (!fs.existsSync(options.targetDirectory)) fs.mkdirSync(options.targetDirectory);

	const __option = {
		framework: {
			...options.app.framework,
			...options.app?.git,
		},

		targetDirectory: options.targetDirectory,
	};

	console.log("options :>> ", __option);

	await pullingOldRepo(__option);

	// console.log("options.project :>> ", options.project);
	// console.log("3");
	// const newApp = await createAppByForm(options);

	// console.log("newApp :>> ", newApp);
}
export { cloneRepo };
