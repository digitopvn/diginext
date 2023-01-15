import { logError } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";

import { getCliConfig } from "@/config/config";
import type { App } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import { getAppConfig, getCurrentRepoURIs } from "@/plugins";

import fetchApi from "../api/fetchApi";
import { askAppInitQuestions } from "../apps/askAppInitQuestions";
import { getRepoSSH, getRepoURL, initializeGitRemote } from "../git";
import { printInformation } from "../project/printInformation";
import { generateAppConfig, writeConfig } from "../project/writeConfig";

export async function execInitApp(options: InputOptions) {
	// TODO: add init app

	console.log(options.username);

	// create new app form:
	await askAppInitQuestions(options);

	// different from "createApp" -> it select the current working directory instead of create new one
	options.skipCreatingDirectory = true;
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	if (!options.project) return logError(`Project is required for creating new app.`);

	// Create new app in the database
	const newData = {
		name: options.name,
		git: options.git,
		createdBy: options.username,
		owner: options.userId,
		project: options.project._id,
		workspace: options.workspaceId,
	};
	const { status, data, messages } = await fetchApi<App>({
		url: `/api/v1/app`,
		method: "POST",
		data: newData,
	});
	if (!status) logError(messages);
	const newApp = data as App;

	// to make sure it write down the correct app "slug" in "dx.json"
	options.slug = newApp.slug;
	options.name = newApp.name;
	options.repoSlug = `${options.projectSlug}-${makeSlug(options.name)}`;

	const { remoteSSH, remoteURL, provider: gitProvider } = await getCurrentRepoURIs(options.targetDirectory);
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
	if (options.git && !remoteSSH) await initializeGitRemote(options);

	// update GIT info in the database
	const updateData = {};
	updateData["framework[name]"] = options.framework.name;
	updateData["framework[slug]"] = options.framework.slug;
	updateData["framework[repoURL]"] = options.framework.repoURL;
	updateData["framework[repoSSH]"] = options.framework.repoSSH;
	const {
		status: updateStatus,
		data: updatedApp,
		messages: updateMessages,
	} = await fetchApi<App>({
		url: `/api/v1/app?slug=${newApp.slug}`,
		method: "PATCH",
		data: newData,
	});
	if (!updateStatus) logError(updateMessages);

	// write "dx.json"
	const appConfig = generateAppConfig(options);
	await writeConfig(appConfig, options);

	// print project information:
	const finalConfig = getAppConfig(options.targetDirectory);
	printInformation(finalConfig);

	return options;
}
