import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";

import type { IProject } from "@/entities";
import { type AppGitInfo, type IApp } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { getCurrentGitRepoData } from "@/plugins";

import { askForGitProvider } from "../git/ask-for-git-provider";
import { printInformation } from "../project/printInformation";
import { getAppConfigFromApp } from "./app-helper";
import { createOrSelectApp } from "./create-or-select-app";
import { createOrSelectProject } from "./create-or-select-project";
import { searchApps } from "./search-apps";

export async function execInitApp(options: InputOptions) {
	const gitInfo = await getCurrentGitRepoData(options.targetDirectory);
	if (options.isDebugging) console.log("[INIT APP] gitInfo :>> ", gitInfo);
	const { DB } = await import("@/modules/api/DB");

	if (gitInfo?.repoSSH) {
		const foundApps = await searchApps({ repoSSH: gitInfo?.repoSSH });
		if (foundApps && foundApps.length > 0) {
			// display list to select:
			foundApps.unshift({ name: "Create new", slug: "new", projectSlug: "" });
			const { selectedApp } = await inquirer.prompt<{ selectedApp: IApp }>({
				type: "list",
				name: "selectedApp",
				message: `Select your app or create new:`,
				choices: foundApps.map((_app, i) => {
					return { name: `[${i + 1}] ${_app.slug} (Project: ${_app.projectSlug})`, value: _app };
				}),
			});

			if (selectedApp.name !== "Create new" && selectedApp.slug !== "new") {
				// assign project info to "options":
				options.project = selectedApp.project as IProject;
				options.projectSlug = options.project.slug;
				options.projectName = options.project.name;
				options.namespace = `${options.project.slug}-${options.env || "dev"}`;
				// assign app info to "options":
				options.app = selectedApp;
				options.slug = options.app.slug;
				options.name = options.app.name;
				if (!selectedApp.git || !selectedApp.git.repoSSH || !selectedApp.git.repoURL) {
					logError(`Unable to select: app "${selectedApp.slug}" is corrupted.`);
					return;
				}
				// git provider
				options.git = selectedApp.gitProvider ? await DB.findOne("git", { _id: selectedApp.gitProvider }) : await askForGitProvider();
				if (!selectedApp.gitProvider && options.git) {
					await DB.updateOne("app", { _id: selectedApp._id }, { gitProvider: options.git._id });
				}
				// app git info
				options.repoSSH = options.app.git.repoSSH;
				options.repoURL = options.app.git.repoURL;
				options.gitProvider = options.app.git.provider;
				options.repoURL = options.repoURL;
				// print project information:
				const finalConfig = getAppConfigFromApp(selectedApp);
				printInformation(finalConfig);
				return options;
			}
		}
	}

	// If no apps or projects found -> create new
	const initProject = await createOrSelectProject(options);
	const initApp = await createOrSelectApp(initProject.slug, options);

	// ! The ONLY different with "createApp":
	// ! Select the current working directory instead of create new one
	options.skipCreatingDirectory = true;
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	// update framework & GIT info in the database
	const updateData = {} as IApp;
	if (options.framework) updateData.framework = options.framework;
	updateData.git = {} as AppGitInfo;
	updateData.git.provider = gitInfo.provider;
	updateData.git.repoURL = gitInfo.repoURL;
	updateData.git.repoSSH = gitInfo.repoSSH;

	if (options.isDebugging) console.log("[INIT APP] updateData :>> ", updateData);
	const [updatedApp] = await DB.update("app", { slug: initApp.slug }, updateData);
	if (options.isDebugging) console.log("[INIT APP] updatedApp :>> ", updatedApp);

	if (!updatedApp) logError(`[INIT APP] Can't initialize app due to network issue.`);

	// print project information:
	const finalConfig = getAppConfigFromApp(updatedApp);
	printInformation(finalConfig);

	return options;
}
