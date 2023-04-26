import { makeSlug } from "diginext-utils/dist/Slug";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { IApp } from "@/entities";
import type { InputOptions } from "@/interfaces";

import { createAppByForm } from "./new-app-by-form";
import { searchApps } from "./search-apps";

export async function createOrSelectApp(projectSlug: string, options: InputOptions, question?: string) {
	const { action } = await inquirer.prompt({
		type: "list",
		name: "action",
		message: question || `Create new or select an existing app?`,
		choices: [
			{ name: "Select existing app", value: "select" },
			{ name: "Create new app", value: "create" },
		],
	});

	let app: IApp;
	if (action === "select") {
		// find/search projects
		const apps = await searchApps({ projectSlug });

		if (!isEmpty(apps)) {
			// display list to select:
			const { selectedApp } = await inquirer.prompt<{ selectedApp: IApp }>({
				type: "list",
				name: "selectedApp",
				message: `Select your app in "${projectSlug}" project:`,
				choices: apps.map((_app, i) => {
					return { name: `[${i + 1}] ${_app.name} (${_app.slug})`, value: _app };
				}),
			});
			app = selectedApp;
		} else {
			app = await createAppByForm(options);
		}
	} else {
		app = await createAppByForm(options);
	}

	if (!app) return;

	options.app = app;
	options.slug = app.slug;
	options.name = app.name;
	options.repoSlug = `${makeSlug(projectSlug)}-${makeSlug(options.name)}`.toLowerCase();
	options.remoteSSH = app.git.repoSSH;
	options.remoteURL = app.git.repoURL;
	options.gitProvider = app.git.provider;
	options.repoURL = options.remoteURL;

	return app;
}
