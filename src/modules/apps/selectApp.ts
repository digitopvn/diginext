import inquirer from "inquirer";

import type { IApp } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { searchApps } from "@/modules/apps/search-apps";
import { makeSlug } from "@/plugins/slug";

//

export default async function selectApp(options?: InputOptions, canSkip: boolean = true) {
	//
	const projectSlug = options?.project?.slug || "";

	const apps = await searchApps({ projectSlug, canSkip });

	// display list to select:
	const { selectedApp } = await inquirer.prompt<{ selectedApp: IApp }>({
		type: "list",
		name: "selectedApp",
		message: `Select your app in "${projectSlug}" project:`,
		choices: apps.map((_app, i) => {
			return { name: `[${i + 1}] ${_app.name} (${_app.slug})`, value: _app };
		}),
	});
	options.app = selectedApp;
	options.slug = selectedApp.slug;
	options.name = selectedApp.name;
	options.repoSlug = `${makeSlug(projectSlug)}-${makeSlug(options.name)}`.toLowerCase();

	return options.app;
}
