import { logError } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";

import { getCliConfig } from "@/config/config";
import type { App } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import { getAppConfig, getCurrentGitRepoData } from "@/plugins";

import { DB } from "../api/DB";
import { generateRepoSSH, generateRepoURL, initializeGitRemote } from "../git";
import { printInformation } from "../project/printInformation";
import { generateAppConfig, writeConfig } from "../project/writeConfig";
import { createAppByForm } from "./new-app-by-form";

export async function execInitApp(options: InputOptions) {
	// Create new app in the database
	const newApp = await createAppByForm(options);

	// ! The ONLY different with "createApp": Select the current working directory instead of create new one
	options.skipCreatingDirectory = true;
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	// to make sure it write down the correct app "slug" in "dx.json"
	options.slug = newApp.slug;
	options.name = newApp.name;
	options.repoSlug = `${options.projectSlug}-${makeSlug(options.name)}`;

	// get current GIT remote url:
	const currentGitData = await getCurrentGitRepoData(options.targetDirectory);
	const { remoteSSH, remoteURL, provider: gitProvider } = currentGitData || {};
	// console.log("{remoteSSH, remoteURL} :>> ", { remoteSSH, remoteURL });

	if (remoteSSH && remoteURL) {
		options.remoteSSH = remoteSSH;
		options.remoteURL = remoteURL;
		options.gitProvider = gitProvider;
	} else {
		// get default git provider from CLI config
		const { currentGitProvider } = getCliConfig();
		if (currentGitProvider?.gitWorkspace) {
			options.remoteSSH = generateRepoSSH(options.gitProvider, `${currentGitProvider.gitWorkspace}/${options.repoSlug}`);
			options.remoteURL = generateRepoURL(options.gitProvider, `${currentGitProvider.gitWorkspace}/${options.repoSlug}`);
		} else {
			logError(`No git providers in this workspace, please configurate one.`);
			return;
		}
	}
	options.repoURL = options.remoteURL;

	// git setup
	if (!remoteSSH) await initalizeAndCreateDefaultBranches(options);
	if (options.shouldUseGit && !remoteSSH) await initializeGitRemote(options);

	// update GIT info in the database
	const { framework } = options;
	const updateData = { framework } as App;

	if (options.shouldUseGit) {
		updateData.git = {};
		updateData.git.provider = options.gitProvider;
		updateData.git.repoURL = options.remoteURL;
		updateData.git.repoSSH = options.remoteSSH;
	}
	if (options.isDebugging) console.log("[INIT APP] updateData :>> ", updateData);

	const [updatedApp] = await DB.update<App>("app", { slug: newApp.slug }, updateData);
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
