import inquirer from "inquirer";
import { isEmpty } from "lodash";

type SearchAppOptions = {
	projectSlug?: string;
	repoSSH?: string;
	question?: string;
	/**
	 * @default true
	 */
	canSkip?: boolean;
};

export async function searchApps(options: SearchAppOptions) {
	const { projectSlug, repoSSH, question, canSkip = true } = options;

	const { DB } = await import("@/modules/api/DB");
	const { keyword } = await inquirer.prompt({
		type: "input",
		name: "keyword",
		message: question ?? "Enter keyword (app's name) to search apps (leave empty to view all):",
	});

	// find/search apps
	const filter: any = {};
	filter.name = keyword;
	if (projectSlug) filter.projectSlug = projectSlug;
	if (repoSSH) filter["git.repoSSH"] = repoSSH;

	let apps = await DB.find("app", filter, { search: true }, { limit: 10, populate: ["project"] });

	if (isEmpty(apps)) {
		if (canSkip) {
			const { shouldSkip } = await inquirer.prompt<{ shouldSkip: boolean }>({
				name: "shouldSkip",
				type: "confirm",
				message: `Do you want to create new app instead?`,
				default: true,
			});
			if (shouldSkip) return [];
		}

		// if don't skip -> keep searching...
		apps = await searchApps({ ...options, question: `No apps found in "${projectSlug}" project. Try another keyword:` });
		return apps;
	} else {
		return apps;
	}
}
