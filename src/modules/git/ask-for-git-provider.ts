import inquirer from "inquirer";
import { isEmpty, upperFirst } from "lodash";

import type { GitProviderDto, IGitProvider } from "@/entities";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { availableGitProviders } from "@/interfaces/SystemTypes";

import { DB } from "../api/DB";
import type { GitOrg } from "./git-provider-api";

export async function askForGitOrg(gitProvider: IGitProvider) {
	// select git org (namespace)
	const orgs = await DB.find<GitOrg>("git", { _id: gitProvider._id }, { subpath: "/orgs", filter: { slug: gitProvider.slug } });
	if (!orgs || orgs.length === 0) throw new Error(`This account doesn't have any git workspaces.`);

	const { org } = await inquirer.prompt<{ org: GitOrg }>({
		type: "list",
		name: "org",
		message: "Select git workspace:",
		default: orgs[0],
		choices: orgs.map((_org) => ({ name: _org.name, value: _org })),
	});

	// update "gitWorkspace" as selected "org"
	const provider = await DB.updateOne<IGitProvider>(
		"git",
		{ _id: gitProvider._id },
		{
			org: org.name,
			public: org.is_org,
			isOrg: org.is_org,
			verified: true,
		}
	);

	return { org, gitProvider: provider };
}

export async function askForGitProvider() {
	const gitProviders = await DB.find<IGitProvider>("git", {});

	if (isEmpty(gitProviders)) {
		// logError(`This workspace doesn't have any git providers integrated.`);
		const gitProviderData: GitProviderDto = {};

		const { gitProviderType } = await inquirer.prompt<{ gitProviderType: GitProviderType }>({
			type: "list",
			name: "gitProviderType",
			message: "Select a git provider to store your app:",
			default: availableGitProviders[0],
			choices: availableGitProviders,
		});
		gitProviderData.type = gitProviderType;

		if (gitProviderType === "bitbucket") {
			const { username } = await inquirer.prompt<{ username: string }>({
				type: "input",
				name: "username",
				message: "Bitbucket username:",
			});
			gitProviderData.name = `${username.toUpperCase()} ${upperFirst(gitProviderType)}`;
			gitProviderData.bitbucket_oauth = {};
			gitProviderData.bitbucket_oauth.username = username;
		}

		const { token } = await inquirer.prompt<{ token: string }>({
			type: "password",
			name: "token",
			mask: true,
			message: gitProviderType === "bitbucket" ? "Bitbucket app password:" : "Github personal access token:",
		});

		if (gitProviderType === "bitbucket") {
			gitProviderData.bitbucket_oauth.app_password = token;
		} else {
			gitProviderData.github_oauth = {};
			gitProviderData.github_oauth.personal_access_token = token;
		}

		// start authentication...
		let gitProvider = await DB.create<IGitProvider>("git", gitProviderData);
		if (!gitProvider) throw new Error(`Unable to authenticate this git provider.`);

		// select org
		const orgRes = await askForGitOrg(gitProvider);
		gitProvider = orgRes.gitProvider;

		return gitProvider;
	}

	const gitProviderChoices = gitProviders.map((gp) => {
		return { name: gp.name, value: gp };
	});
	console.log("gitProviderChoices :>> ", gitProviderChoices);

	let { gitProvider: selectedGitProvider } = await inquirer.prompt<{ gitProvider: IGitProvider }>({
		type: "list",
		name: "gitProvider",
		message: "Git provider:",
		default: gitProviderChoices[0],
		choices: gitProviderChoices,
	});
	console.log("selectedGitProvider :>> ", selectedGitProvider);

	if (!selectedGitProvider.verified) {
		// select org
		const orgRes = await askForGitOrg(selectedGitProvider);
		selectedGitProvider = orgRes.gitProvider;
	}

	return selectedGitProvider;
}
