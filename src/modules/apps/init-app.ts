import { logError } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";

import { getCliConfig } from "@/config/config";
import type { App } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import { getAppConfig, getCurrentRepoURIs } from "@/plugins";

import { DB } from "../api/DB";
import { getRepoSSH, getRepoURL, initializeGitRemote } from "../git";
import { printInformation } from "../project/printInformation";
import { generateAppConfig, writeConfig } from "../project/writeConfig";
import { askAppInitQuestions } from "./askAppInitQuestions";

export async function execInitApp(options: InputOptions) {
	// create new app form:
	await askAppInitQuestions(options);

	// different from "createApp" -> it select the current working directory instead of create new one
	options.skipCreatingDirectory = true;
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	if (!options.project) return logError(`Project is required for creating new app.`);

	// Create new app in the database
	const newData = {
		name: options.name,
		createdBy: options.username,
		owner: options.userId,
		project: options.project._id,
		workspace: options.workspaceId,
	} as App;

	const newApp = await DB.create<App>("app", newData);
	if (!newApp) logError(`Failed to create new app due to network error.`);

	// to make sure it write down the correct app "slug" in "dx.json"
	options.slug = newApp.slug;
	options.name = newApp.name;
	options.repoSlug = `${options.projectSlug}-${makeSlug(options.name)}`;

	const { remoteSSH, remoteURL, provider: gitProvider } = await getCurrentRepoURIs(options.targetDirectory);
	// console.log("{remoteSSH, remoteURL} :>> ", { remoteSSH, remoteURL });

	if (remoteSSH && remoteURL) {
		options.remoteSSH = remoteSSH;
		options.remoteURL = remoteURL;
		options.gitProvider = gitProvider;
	} else {
		const { currentGitProvider } = getCliConfig();
		if (currentGitProvider?.gitWorkspace) {
			options.remoteSSH = getRepoSSH(options.gitProvider, `${currentGitProvider.gitWorkspace}/${options.repoSlug}`);
			options.remoteURL = getRepoURL(options.gitProvider, `${currentGitProvider.gitWorkspace}/${options.repoSlug}`);
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
		updateData.git.provider = options.gitProvider;
		updateData.git.repoURL = options.remoteURL;
		updateData.git.repoSSH = options.remoteSSH;
	}

	const [updatedApp] = await DB.update<App>("app", { slug: newApp.slug }, updateData);

	if (!updatedApp) logError(`Can't initialize app due to network issue.`);

	// write "dx.json"
	const appConfig = generateAppConfig(options);
	await writeConfig(appConfig, options);

	// print project information:
	const finalConfig = getAppConfig(options.targetDirectory);
	printInformation(finalConfig);

	return options;
}
