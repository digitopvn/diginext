import { log, logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty, upperFirst } from "lodash";

import type { AppDto, AppGitInfo, IApp } from "@/entities";
import type { IFramework } from "@/entities/Framework";
import type InputOptions from "@/interfaces/InputOptions";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { getCurrentGitRepoData, parseGitRepoDataFromRepoSSH } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

import { DB } from "../api/DB";
import { checkGitProviderAccess, checkGitRepoAccess } from "../git";
import { askForGitProvider } from "../git/ask-for-git-provider";
import type { GitRepository, GitRepositoryDto } from "../git/git-provider-api";
import { createOrSelectProject } from "./create-or-select-project";
import { updateAppConfig } from "./update-config";

export async function createAppByForm(
	options?: InputOptions & {
		/**
		 * Skip selecting framework step
		 * @default false
		 */
		skipFramework?: boolean;
	}
) {
	if (!options.project) options.project = await createOrSelectProject(options);
	// console.log("options.project :>> ", options.project);

	const { skipFramework = false } = options;

	if (!options.name) {
		const { name } = await inquirer.prompt({
			type: "input",
			name: "name",
			message: "Enter your app name:",
			validate: function (value) {
				if (value.length >= 3) {
					return true;
				} else {
					return "App name is required & has at least 3 characters.";
				}
			},
		});
		// console.log("createAppByForm > name :>> ", name);
		options.name = name;
	}

	// git repo slug
	options.repoSlug = `${options.project.slug}-${makeSlug(options.name)}`.toLowerCase();

	const noneFramework = { name: "None/unknown", slug: "none", isPrivate: false } as IFramework;
	let curFramework = noneFramework;
	// can skip selecting framework if wanted (eg. when deploy existing app)
	if (skipFramework) options.framework = curFramework = noneFramework;

	if (!options.framework) {
		const frameworks = await DB.find<IFramework>("framework", {});

		const selectFrameworks = [noneFramework];
		if (!isEmpty(frameworks)) selectFrameworks.push(...frameworks);
		// log({ selectFrameworks });

		const { framework } = await inquirer.prompt<{ framework: IFramework }>({
			type: "list",
			name: "framework",
			message: "Select starting framework:",
			default: selectFrameworks[0],
			choices: selectFrameworks.map((fw) => {
				return { name: fw.name, value: fw };
			}),
		});

		curFramework = framework;
	}
	options.framework = curFramework;

	// Check git provider authentication
	let isFwPrivate = false;
	let frameworkGitProvider: GitProviderType;
	let fwSlug = options.framework.slug;
	let fwRepoSSH = "";

	if (fwSlug !== "none") {
		const { isPrivate, repoSSH } = options.framework;
		isFwPrivate = isPrivate;
		fwRepoSSH = repoSSH;

		const { gitProvider } = parseGitRepoDataFromRepoSSH(repoSSH);
		frameworkGitProvider = gitProvider;

		const { namespace } = parseGitRepoDataFromRepoSSH(fwRepoSSH);
		if (!isFwPrivate) {
			const canAccessPublicRepo = await checkGitProviderAccess(frameworkGitProvider);
			if (!canAccessPublicRepo) {
				logError(`You need to authenticate ${upperFirst(frameworkGitProvider)} first to be able to pull this framework.`);
				return;
			}
		} else {
			const canAccessPrivateRepo = await checkGitRepoAccess(fwRepoSSH);
			if (!canAccessPrivateRepo) {
				logError(`You may not have access to this private repository or ${namespace} organization, please authenticate first.`);
				return;
			}
		}

		// Request select specific version
		const { frameworkVersion } = await inquirer.prompt({
			type: "input",
			name: "frameworkVersion",
			message: `Framework version:`,
			default: curFramework?.mainBranch || "main",
		});
		options.frameworkVersion = frameworkVersion;
	} else {
		options.frameworkVersion = "unknown";
	}

	const currentGitData = options.shouldCreate ? undefined : await getCurrentGitRepoData(options.targetDirectory);
	if (options.isDebugging) log(`[CREATE APP BY FORM] current git data :>>`, currentGitData);

	if (currentGitData) {
		options.gitProvider = currentGitData.provider;
		options.remoteSSH = currentGitData.remoteSSH;
		options.remoteURL = currentGitData.remoteURL;
	} else {
		let gitProvider = await askForGitProvider();

		// Create new repo:
		const repoData: GitRepositoryDto = {
			name: options.repoSlug,
			private: !options.isPublic,
		};
		if (options.isDebugging) console.log("[newAppByForm] CREATE REPO > repoData :>> ", repoData);
		const newRepo = await DB.create<GitRepository>("git", repoData, {
			subpath: "/orgs/repos",
			filter: { slug: gitProvider.slug },
		});
		if (options.isDebugging) console.log("[newAppByForm] CREATE REPO > newRepo :>> ", newRepo);

		options.gitProvider = newRepo.provider;
		options.remoteSSH = newRepo.ssh_url;
		options.remoteURL = newRepo.repo_url;
	}

	// Call API to create new app
	const appData: AppDto = {
		name: options.name,
		// createdBy: options.username,
		// owner: options.userId,
		// workspace: options.workspaceId,
		project: options.project._id,
		framework: {
			name: options.framework.name,
			slug: options.framework.slug,
			repoSSH: options.framework.repoSSH,
			repoURL: options.framework.repoURL,
			version: options.frameworkVersion,
		},
		git: currentGitData
			? ({ repoSSH: currentGitData.remoteSSH, provider: currentGitData.provider, repoURL: currentGitData.remoteURL } as AppGitInfo)
			: ({} as AppGitInfo),
		environment: {},
		deployEnvironment: {},
	};

	// console.log("createAppByForm > appData :>> ", appData);

	appData.git.provider = options.gitProvider;
	if (options.remoteSSH) appData.git.repoSSH = options.remoteSSH;
	if (options.remoteURL) appData.git.repoURL = options.remoteURL;

	if (options.isDebugging) log(`Create new app with data:`, appData);
	const newApp = await DB.create<IApp>("app", appData);
	if (options.isDebugging) log({ newApp });

	if (isEmpty(newApp) || (newApp as any).error) {
		logError(`[CREATE APP BY FORM] Can't create new app due to network issue.`);
		return;
	}

	// to make sure it write down the correct app "slug" in app config
	options.app = newApp;
	options.slug = newApp.slug;
	options.name = newApp.name;

	// update existing app config if any
	let appConfig = await updateAppConfig(newApp);
	if (options.isDebugging) console.log("createAppByForm > appConfig :>> ", appConfig);

	return newApp;
}
