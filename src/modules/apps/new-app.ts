import { logError, logWarn } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import fs from "fs";
// import Listr from "listr";
import path from "path";

import { getCliConfig } from "@/config/config";
import type App from "@/entities/App";
import type { InputOptions } from "@/interfaces/InputOptions";
import { pullingFramework } from "@/modules/framework";
import { generateRepoSSH, generateRepoURL, initializeGitRemote } from "@/modules/git";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import { printInformation } from "@/modules/project/printInformation";
import { generateAppConfig, writeConfig } from "@/modules/project/writeConfig";
import { getAppConfig } from "@/plugins";

import { DB } from "../api/DB";
import { createAppByForm } from "./new-app-by-form";

/**
 * Create new app with pre-setup: git, cli, config,...
 */
export default async function createApp(options: InputOptions) {
	// FORM > Create new project & app:
	const newApp = await createAppByForm(options);
	console.log("newApp :>> ", newApp);

	// make sure it always create new directory:
	options.skipCreatingDirectory = false;
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = path.resolve(process.cwd(), options.slug);

	const { skipCreatingDirectory } = options;

	if (!skipCreatingDirectory) {
		if (fs.existsSync(options.targetDirectory)) {
			if (options.overwrite) {
				fs.rmSync(options.targetDirectory, { recursive: true, force: true });
			} else {
				logError(`App directory with name "${options.slug}" was already existed.`);
				return;
			}
		}

		if (!fs.existsSync(options.targetDirectory)) fs.mkdirSync(options.targetDirectory);
	}

	if (options.shouldInstallPackage) await pullingFramework(options);

	if (!options.project) {
		logError(`Project is required for creating new app.`);
		return;
	}
	options.projectSlug = options.project.slug;

	// setup git:
	options.repoSlug = `${options.projectSlug}-${makeSlug(options.name)}`;

	const { currentGitProvider } = getCliConfig();
	// log({ currentGitProvider });
	if (currentGitProvider?.gitWorkspace) {
		options.remoteSSH = generateRepoSSH(options.gitProvider, `${currentGitProvider.gitWorkspace}/${options.repoSlug}`);
		options.repoURL = generateRepoURL(options.gitProvider, `${currentGitProvider.gitWorkspace}/${options.repoSlug}`);
		options.remoteURL = options.repoURL;
	}

	await initalizeAndCreateDefaultBranches(options);

	if (options.shouldUseGit) {
		try {
			await initializeGitRemote(options);
		} catch (e) {
			logWarn(`Can't initialize git remote: ${options.remoteSSH}`);
		}

		// update git info to database
		const [updatedApp] = await DB.update<App>(
			"app",
			{ slug: options.slug },
			{ git: { provider: options.gitProvider, repoSSH: options.remoteSSH, repoURL: options.remoteURL } }
		);
		if (!updatedApp) {
			logError("Can't create new app due to network issue while updating git repo info.");
			return;
		}
	}

	// write "dx.json"
	const appConfig = generateAppConfig(options);
	await writeConfig(appConfig, options);

	// print project information:
	const finalConfig = getAppConfig(options.targetDirectory);
	printInformation(finalConfig);

	return newApp;
}

export { createApp };
