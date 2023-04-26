import { logError } from "diginext-utils/dist/console/log";

import type { AppGitInfo, IApp } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { getAppConfig } from "@/plugins";

import { DB } from "../api/DB";
import { printInformation } from "../project/printInformation";
import { generateAppConfig, writeConfig } from "../project/writeConfig";
import { createOrSelectApp } from "./create-or-select-app";
import { createOrSelectProject } from "./create-or-select-project";

export async function execInitApp(options: InputOptions) {
	const initProject = await createOrSelectProject(options);
	const initApp = await createOrSelectApp(initProject.slug, options);

	// ! The ONLY different with "createApp": Select the current working directory instead of create new one
	options.skipCreatingDirectory = true;
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	// update GIT info in the database
	const { framework } = options;

	const updateData = {} as IApp;
	if (framework) updateData.framework = framework;
	updateData.git = {} as AppGitInfo;
	updateData.git.provider = options.gitProvider;
	updateData.git.repoURL = options.remoteURL;
	updateData.git.repoSSH = options.remoteSSH;

	if (options.isDebugging) console.log("[INIT APP] updateData :>> ", updateData);
	const [updatedApp] = await DB.update<IApp>("app", { slug: initApp.slug }, updateData);
	if (options.isDebugging) console.log("[INIT APP] updatedApp :>> ", updatedApp);

	if (!updatedApp) logError(`[INIT APP] Can't initialize app due to network issue.`);

	// write "dx.json"
	const appConfig = generateAppConfig(options);
	await writeConfig(appConfig, options);

	// print project information:
	const finalConfig = getAppConfig(options.targetDirectory);
	printInformation(finalConfig);

	return options;
}
