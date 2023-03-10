import { log, logError } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty, upperFirst } from "lodash";

import { saveCliConfig } from "@/config/config";
import type { App } from "@/entities";
import Framework from "@/entities/Framework";
import type GitProvider from "@/entities/GitProvider";
import type InputOptions from "@/interfaces/InputOptions";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { getAppConfig, getCurrentGitRepoData, parseGitRepoDataFromRepoSSH, updateAppConfig } from "@/plugins";

import { DB } from "../api/DB";
import { checkGitProviderAccess, checkGitRepoAccess } from "../git";
import { createOrSelectProject } from "./create-or-select-project";

export async function createAppByForm(options?: InputOptions) {
	if (!options.project) options.project = await createOrSelectProject(options);

	if (!options.name) {
		const { name } = await inquirer.prompt({
			type: "input",
			name: "name",
			message: "Enter your app name:",
			validate: function (value) {
				if (value.length > 3) {
					return true;
				} else {
					return "App name is required & has more than 3 characters.";
				}
			},
		});
		options.name = name;
	}

	// "kind of" unique slug
	// options.slug = (makeSlug(options.name) + "-" + generatePassword(6, true)).toLowerCase();

	const noneFramework = new Framework({ name: "None/unknown", slug: "none", isPrivate: false });
	let curFramework: Framework = noneFramework;
	if (!options.framework) {
		const frameworks = await DB.find<Framework>("framework", {});

		const selectFrameworks = [noneFramework];
		if (!isEmpty(frameworks)) selectFrameworks.push(...frameworks);
		// log({ selectFrameworks });

		const { framework } = await inquirer.prompt<{ framework: Framework }>({
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
	}

	const currentGitData = await getCurrentGitRepoData(options.targetDirectory);
	if (options.isDebugging) log(`[CREATE APP BY FORM] current git data :>>`, currentGitData);

	if (currentGitData) {
		options.shouldUseGit = true;
		options.gitProvider = currentGitData.provider;
		options.remoteSSH = currentGitData.remoteSSH;
		options.remoteURL = currentGitData.remoteURL;
	} else {
		if (options.shouldUseGit) {
			let currentGitProvider: GitProvider;
			if (!options.gitProvider) {
				const gitProviders = await DB.find<GitProvider>("git", {});

				if (isEmpty(gitProviders)) {
					logError(`This workspace doesn't have any git providers integrated.`);
					return;
				}

				const gitProviderChoices = [
					{ name: "None", value: { name: "None", slug: "none" } },
					...gitProviders.map((g) => {
						return { name: g.name, value: g };
					}),
				];

				const { gitProvider } = await inquirer.prompt({
					type: "list",
					name: "gitProvider",
					message: "Git provider:",
					choices: gitProviderChoices,
				});

				if (gitProvider.slug !== "none") {
					currentGitProvider = gitProvider;
					options.gitProvider = currentGitProvider.type;

					// set this git provider to default:
					saveCliConfig({ currentGitProvider });
				} else {
					options.shouldUseGit = false;
				}
			} else {
				// search for this git provider
				currentGitProvider = await DB.findOne<GitProvider>("git", { slug: options.gitProvider });
				if (!currentGitProvider) {
					logError(`Git provider "${options.gitProvider}" not found.`);
					return;
				}

				options.gitProvider = currentGitProvider.slug;

				// set this git provider to default:
				saveCliConfig({ currentGitProvider });
			}
		}
	}

	// Call API to create new app
	const appData = {
		name: options.name,
		createdBy: options.username,
		owner: options.userId,
		projectSlug: options.project.slug,
		project: options.project._id,
		workspace: options.workspaceId,
		framework: {
			name: options.framework.name,
			slug: options.framework.slug,
			repoSSH: options.framework.repoSSH,
			repoURL: options.framework.repoURL,
		},
		git: {},
		environment: {},
		deployEnvironment: {},
	} as App;

	if (options.shouldUseGit) {
		appData.git.provider = options.gitProvider;
		if (options.remoteSSH) appData.git.repoSSH = options.remoteSSH;
		if (options.remoteURL) appData.git.repoURL = options.remoteURL;
	}
	if (options.isDebugging) log(`Create new app with data:`, appData);
	const newApp = await DB.create<App>("app", appData);
	if (options.isDebugging) log({ newApp });

	if (isEmpty(newApp) || (newApp as any).error) {
		logError(`[CREATE APP BY FORM] Can't create new app due to network issue.`);
		return;
	}

	// to make sure it write down the correct app "slug" in "dx.json"
	options.app = newApp;
	options.slug = newApp.slug;
	options.name = newApp.name;

	// update existing "dx.json" if any
	const appConfig = getAppConfig(options.targetDirectory);
	if (appConfig) updateAppConfig({ slug: newApp.slug, project: options.project.slug, name: newApp.name });

	return newApp;
}
