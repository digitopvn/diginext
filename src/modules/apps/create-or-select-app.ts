import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { App } from "@/entities";
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

	let app: App;
	if (action === "select") {
		// find/search projects
		const apps = await searchApps({ projectSlug });

		if (!isEmpty(apps)) {
			// display list to select:
			const { selectedApp } = await inquirer.prompt<{ selectedApp: App }>({
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

	options.app = app;
	options.slug = app.slug;

	return app;
}
