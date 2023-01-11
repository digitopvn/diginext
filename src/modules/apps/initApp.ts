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

	// Save this app to database
	if (!options.project) return logError(`Project is required for creating new app.`);

	const { status, data, messages } = await fetchApi<App>({
		url: `/api/v1/app`,
		method: "POST",
		data: {
			name: options.name,
			git: options.git,
			framework: options.framework,
			environment: {},
			createdBy: options.username,
			owner: options.userId,
			project: options.project._id,
			workspace: options.workspaceId,
		},
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

	// git
	if (!remoteSSH) await initalizeAndCreateDefaultBranches(options);
	if (options.git && !remoteSSH) await initializeGitRemote(options);

	// write "dx.json"
	const appConfig = generateAppConfig(options);
	await writeConfig(appConfig, options);

	// print project information:
	const finalConfig = getAppConfig(options.targetDirectory);
	printInformation(finalConfig);

	return options;
}
