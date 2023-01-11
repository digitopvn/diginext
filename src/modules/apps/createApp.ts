import { logError } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import fs from "fs";
// import Listr from "listr";
import path from "path";

import { getCliConfig } from "@/config/config";
import type App from "@/entities/App";
import type { InputOptions } from "@/interfaces/InputOptions";
import fetchApi from "@/modules/api/fetchApi";
import { pullingFramework } from "@/modules/framework";
import { getRepoSSH, getRepoURL, initializeGitRemote } from "@/modules/git";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import { printInformation } from "@/modules/project/printInformation";
import { generateAppConfig, writeConfig } from "@/modules/project/writeConfig";
import { getAppConfig } from "@/plugins";

import { askAppQuestions } from "./askAppQuestions";

/**
 * Create new app with pre-setup: git, cli, config,...
 */
export default async function createApp(options: InputOptions) {
	// create new app form:
	await askAppQuestions(options);

	// make sure it always create new directory:
	options.skipCreatingDirectory = false;
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = path.resolve(process.cwd(), options.slug);

	const { skipCreatingDirectory } = options;

	if (!skipCreatingDirectory) {
		if (fs.existsSync(options.targetDirectory)) {
			if (options.overwrite) {
				fs.rmSync(options.targetDirectory, { recursive: true, force: true });
			} else {
				logError("Project directory was already existed.");
			}
		}

		if (!fs.existsSync(options.targetDirectory)) fs.mkdirSync(options.targetDirectory);
	}

	if (options.shouldInstallPackage) await pullingFramework(options);

	// Save this app to database
	if (!options.project) return logError(`Project is required for creating new app.`);

	// const { currentUser, currentWorkspace } = getCliConfig();

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
	// log({ newApp });

	// to make sure it write down the correct app "slug" in "di.json"
	options.slug = newApp.slug;
	options.name = newApp.name;
	options.repoSlug = `${options.projectSlug}-${makeSlug(options.name)}`;

	const { currentGitProvider } = getCliConfig();
	if (currentGitProvider?.gitWorkspace) {
		options.remoteSSH = getRepoSSH(options.gitProvider, `${currentGitProvider.gitWorkspace}/${options.repoSlug}`);
		options.repoURL = getRepoURL(options.gitProvider, `${currentGitProvider.gitWorkspace}/${options.repoSlug}`);
		options.remoteURL = options.repoURL;
	}

	// git
	await initalizeAndCreateDefaultBranches(options);

	if (options.git) await initializeGitRemote(options);

	// write "di.json"
	const appConfig = generateAppConfig(options);
	await writeConfig(appConfig, options);

	// print project information:
	const finalConfig = getAppConfig(options.targetDirectory);
	printInformation(finalConfig);

	return true;
}

export { createApp };
