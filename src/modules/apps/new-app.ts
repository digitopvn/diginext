import { logError } from "diginext-utils/dist/xconsole/log";
import fs from "fs";
// import Listr from "listr";
import path from "path";

import type { InputOptions } from "@/interfaces/InputOptions";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import { pullingFramework } from "@/modules/framework";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import { printInformation } from "@/modules/project/printInformation";

import { createEmptyAppDirectory } from "./create-empty-app-dir";
import { createAppByForm } from "./new-app-by-form";

/**
 * Create new app with pre-setup: git, cli, config,...
 */
export default async function createApp(options: InputOptions) {
	const { DB } = await import("@/modules/api/DB");
	// FORM > Create new project & app:
	const newApp = await createAppByForm(options);
	// console.log("newApp :>> ", newApp);

	// make sure it always create new directory:
	options.skipCreatingDirectory = false;

	if (!options.project) {
		logError(`Project is required for creating new app.`);
		return;
	}
	options.projectSlug = options.project.slug;

	// setup git:
	options.repoSlug = `${options.projectSlug}-${newApp.slug}`.toLowerCase();

	if (typeof options.targetDirectory == "undefined") options.targetDirectory = path.resolve(process.cwd(), options.repoSlug);

	const { skipCreatingDirectory } = options;

	if (!skipCreatingDirectory) {
		if (fs.existsSync(options.targetDirectory)) {
			if (options.overwrite) {
				fs.rmSync(options.targetDirectory, { recursive: true, force: true });
			} else {
				logError(`App directory with name "${options.repoSlug}" was already existed.`);
				return;
			}
		}

		if (!fs.existsSync(options.targetDirectory)) fs.mkdirSync(options.targetDirectory);
	}

	if (options.isDebugging) console.log("createApp() > options.framework :>> ", options.framework);

	// pull/clone framework...
	if (options.framework && options.framework.slug !== "none") {
		await pullingFramework(options);
	} else {
		await createEmptyAppDirectory(options);
	}

	// update git info to database
	const updateAppData = { git: { provider: options.gitProvider, repoSSH: options.repoSSH, repoURL: options.repoURL } };
	if (options.isDebugging) console.log("[NEW APP] updateAppData :>> ", updateAppData);
	const updatedApp = await DB.updateOne("app", { slug: options.slug }, updateAppData);
	if (!updatedApp) throw new Error("Unable to create new app, try again with `--debug` flag to diagnose.");

	// setup git remote & create initial commits, branches
	await initalizeAndCreateDefaultBranches(options);

	// print project information:
	const finalConfig = getAppConfigFromApp(updatedApp);
	printInformation(finalConfig);

	return newApp;
}

export { createApp };
