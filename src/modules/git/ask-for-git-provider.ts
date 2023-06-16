import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { IGitProvider } from "@/entities";

import { DB } from "../api/DB";

export async function askForGitProvider() {
	const gitProviders = await DB.find<IGitProvider>("git", { verified: true });

	if (isEmpty(gitProviders)) {
		logError(`This workspace doesn't have any git providers integrated.`);
		return;
	}

	const gitProviderChoices = gitProviders.map((gp) => {
		return { name: gp.name, value: gp };
	});

	const { gitProvider } = await inquirer.prompt<{ gitProvider: IGitProvider }>({
		type: "list",
		name: "gitProvider",
		message: "Git provider:",
		default: gitProviderChoices[0],
		choices: gitProviderChoices,
	});

	return gitProvider;
}
