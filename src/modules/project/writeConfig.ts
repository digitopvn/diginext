import fs from "fs";

import { getCliConfig } from "@/config/config";
import type { AppConfig } from "@/interfaces/AppConfig";
import type { InputOptions } from "@/interfaces/InputOptions";
import { getPackageConfig, saveAppConfig } from "@/plugins";

/**
 * Generate "dx.json" (app configuration file)
 */
export function generateAppConfig(options: InputOptions) {
	const pkgConfig = getPackageConfig({ directory: options.targetDirectory });
	const cliConfig = getCliConfig();
	const appConfig = {} as AppConfig;

	// app
	appConfig.name = options.name;
	appConfig.slug = options.slug;
	appConfig.owner = cliConfig.currentUser.slug;
	appConfig.workspace = cliConfig.currentWorkspace.slug;
	appConfig.project = options.projectSlug;

	// git
	if (options.shouldUseGit) {
		appConfig.git = {
			provider: options.gitProvider,
			repoURL: options.repoURL,
			repoSSH: options.remoteSSH,
		};
	}

	// framework
	appConfig.framework = {
		name: options.framework.name,
		slug: options.framework.slug,
		repoSSH: options.framework.repoSSH,
		version: pkgConfig.version ?? options.frameworkVersion ?? "",
	};

	// environment
	appConfig.environment = {};

	return appConfig;
}

export async function writeConfig(appConfig: AppConfig, options?: InputOptions) {
	// const appConfig = generateAppConfig(options);

	// write dx.json
	if (!fs.existsSync(options.targetDirectory)) fs.mkdirSync(options.targetDirectory);
	saveAppConfig(appConfig, { create: true, directory: options.targetDirectory });

	return appConfig;
}
