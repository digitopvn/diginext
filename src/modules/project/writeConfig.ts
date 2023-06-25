import fs from "fs";

import { getCliConfig } from "@/config/config";
import type { AppConfig } from "@/interfaces/AppConfig";
import type { InputOptions } from "@/interfaces/InputOptions";
import { getPackageConfig, saveAppConfig } from "@/plugins";

/**
 * Generate deploy environment config on Diginext workspace
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
	appConfig.git = {
		provider: options.gitProvider,
		repoURL: options.repoURL,
		repoSSH: options.remoteSSH,
	};

	// framework
	appConfig.framework = {
		name: options.framework?.name || "Unknown",
		slug: options.framework?.slug || "unknown",
		repoSSH: options.framework?.repoSSH || "unknown",
		version: pkgConfig.version ?? options.frameworkVersion ?? "unknown",
	};

	// environment
	appConfig.deployEnvironment = {};

	return appConfig;
}

export async function writeConfig(appConfig: AppConfig, options?: InputOptions) {
	// const appConfig = generateAppConfig(options);

	// write dx.json
	if (!fs.existsSync(options.targetDirectory)) fs.mkdirSync(options.targetDirectory);
	saveAppConfig(appConfig, { create: true, directory: options.targetDirectory });

	return appConfig;
}