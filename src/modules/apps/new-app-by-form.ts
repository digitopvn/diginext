import { log, logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { AppGitInfo, IApp } from "@/entities";
import type { IFramework } from "@/entities/Framework";
import type InputOptions from "@/interfaces/InputOptions";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { getCurrentGitRepoData, parseGitRepoDataFromRepoSSH } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

import { askForGitProvider } from "../git/ask-for-git-provider";
import type { GitRepositoryDto } from "../git/git-provider-api";
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
	const { DB } = await import("@/modules/api/DB");

	const { skipFramework } = options;

	if (options.isDebugging) console.log("createAppByForm > options.framework :>> ", options.framework);
	if (options.isDebugging) console.log("createAppByForm > skipFramework :>> ", skipFramework);

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

	const noneFramework = { name: "None/unknown", slug: "none", version: "unknown", isPrivate: false } as IFramework;

	// if "--framework" flag is defined...
	let curFramework = options.framework && options.framework.slug !== "none" ? options.framework : noneFramework;

	// can skip selecting framework if wanted (eg. when deploy existing app)
	if (skipFramework) options.framework = curFramework = noneFramework;

	if (!options.framework) {
		const frameworks = await DB.find("framework", {});

		const selectFrameworks = [noneFramework];
		if (!isEmpty(frameworks)) selectFrameworks.push(...frameworks);
		// log({ selectFrameworks });

		const { framework } = await inquirer.prompt<{ framework: IFramework }>({
			type: "list",
			name: "framework",
			message: "Select starting framework:",
			default: selectFrameworks[0],
			choices: selectFrameworks.map((fw) => {
				return { name: `${fw.name} ${fw.gitProvider ? `(${fw.gitProvider})` : ""}`, value: fw };
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

		const { providerType: gitProvider } = parseGitRepoDataFromRepoSSH(repoSSH);
		frameworkGitProvider = gitProvider;

		const { namespace } = parseGitRepoDataFromRepoSSH(fwRepoSSH);
		// if (!isFwPrivate) {
		// 	const canAccessPublicRepo = await checkGitProviderAccess(frameworkGitProvider);
		// 	if (!canAccessPublicRepo) {
		// 		logError(`You need to authenticate ${upperFirst(frameworkGitProvider)} first to be able to pull this framework.`);
		// 		return;
		// 	}
		// } else {
		// 	const canAccessPrivateRepo = await checkGitRepoAccess(fwRepoSSH);
		// 	if (!canAccessPrivateRepo) {
		// 		logError(`You may not have access to this private repository or ${namespace} organization, please authenticate first.`);
		// 		return;
		// 	}
		// }

		// Request select specific version
		if (!options.frameworkVersion) {
			const { frameworkVersion } = await inquirer.prompt({
				type: "input",
				name: "frameworkVersion",
				message: `Framework version:`,
				default: curFramework?.mainBranch || "main",
			});
			options.frameworkVersion = frameworkVersion;
		}
	} else {
		options.frameworkVersion = "unknown";
	}

	// select git provider for this app:
	let gitProvider = options.git || (await askForGitProvider());
	options.git = gitProvider;
	options.gitProvider = gitProvider.type;
	if (options.isDebugging) log(`[CREATE APP BY FORM] git provider :>>`, gitProvider);

	const currentGitData = options.shouldCreate ? undefined : await getCurrentGitRepoData(options.targetDirectory);
	if (options.isDebugging) log(`[CREATE APP BY FORM] current git data :>>`, currentGitData);

	if (currentGitData) {
		options.gitProvider = currentGitData.provider;
		options.repoSSH = currentGitData.repoSSH;
		options.repoURL = currentGitData.repoURL;
	} else {
		// Create new repo:
		const repoData: GitRepositoryDto = {
			name: options.repoSlug,
			private: !options.isPublic,
		};

		// ![DANGER] if "--force" was declared, try to delete if the repo was existed
		if (options.overwrite) {
			try {
				await DB.delete(
					"git_repo",
					{ slug: gitProvider.slug },
					{ name: options.repoSlug },
					{
						subpath: "/orgs/repos",
						ignorable: true,
					}
				);
			} catch (e) {}
		}

		if (options.isDebugging) console.log("[newAppByForm] CREATE REPO > repoData :>> ", repoData);
		const newRepo = await DB.create("git_repo", repoData, {
			subpath: "/orgs/repos",
			filter: { slug: gitProvider.slug },
			isDebugging: true,
		});
		if (options.isDebugging) console.log("[newAppByForm] CREATE REPO > newRepo :>> ", newRepo);

		if (!newRepo) {
			logError("Something went wrong!");
			return;
		}
		options.gitProvider = newRepo.provider;
		options.repoSSH = newRepo.ssh_url;
		options.repoURL = newRepo.repo_url;
	}

	// Call API to create new app
	const appData: IApp = {
		name: options.name,
		public: options.git.public,
		project: options.project._id,
		framework: {
			name: options.framework.name,
			slug: options.framework.slug,
			repoSSH: options.framework.repoSSH,
			repoURL: options.framework.repoURL,
			version: options.frameworkVersion,
		},
		git: currentGitData
			? ({ repoSSH: currentGitData.repoSSH, provider: currentGitData.provider, repoURL: currentGitData.repoURL } as AppGitInfo)
			: ({} as AppGitInfo),
		environment: {},
		deployEnvironment: {},
		gitProvider: options.git?._id,
		// ownership
		owner: options.userId,
		ownerSlug: options.user,
		workspace: options.workspaceId,
		workspaceSlug: options.workspace.slug,
	};

	appData.git.provider = options.gitProvider;
	if (options.repoSSH) appData.git.repoSSH = options.repoSSH;
	if (options.repoURL) appData.git.repoURL = options.repoURL;

	if (options.isDebugging) log(`Create new app with data:`, appData);
	const newApp = await DB.create("app", appData, { isDebugging: options.isDebugging });
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
