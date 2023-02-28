import { logError } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty, upperFirst } from "lodash";

import { saveCliConfig } from "@/config/config";
import type { App } from "@/entities";
import Framework from "@/entities/Framework";
import type GitProvider from "@/entities/GitProvider";
import type Project from "@/entities/Project";
import type InputOptions from "@/interfaces/InputOptions";
import createProject from "@/modules/project/create-project";
import { getGitRepoDataFromRepoSSH } from "@/plugins";

import { DB } from "../api/DB";
import { checkGitProviderAccess, checkGitRepoAccess } from "../git";

async function searchProjects(question?: string) {
	const { keyword } = await inquirer.prompt({
		type: "input",
		name: "keyword",
		message: question ?? "Enter keyword to search projects (leave empty to get recent projects):",
	});

	// find/search projects
	let projects = await DB.find<Project>("project", { name: keyword }, { search: true }, { limit: 10 });

	if (isEmpty(projects)) {
		projects = await searchProjects(`No projects found. Try another keyword:`);
		return projects;
	} else {
		return projects;
	}
}

export async function askAppQuestions(options?: InputOptions) {
	if (!options.project) {
		const { shouldCreateNewProject } = await inquirer.prompt({
			type: "confirm",
			name: "shouldCreateNewProject",
			message: "Create new project? (NO if you want to select an existing project)",
			default: true,
		});

		if (!shouldCreateNewProject) {
			// find/search projects
			const projects = await searchProjects();
			// log({ projects });

			// display list to select:
			const { selectedProject } = await inquirer.prompt({
				type: "list",
				name: "selectedProject",
				message: "Select your project:",
				choices: projects.map((p) => {
					return { name: `${p.name} (${p.slug})`, value: p };
				}),
			});
			options.project = selectedProject;
			options.projectSlug = selectedProject.slug;
			options.projectName = selectedProject.name;
		} else {
			const newProject = await createProject(options);
			options.project = newProject;
			options.projectSlug = newProject.slug;
			options.projectName = newProject.name;
		}
	}

	options.namespace = options.projectSlug;

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

	let curFramework;
	if (!options.framework) {
		const frameworks = await DB.find<Framework>("framework", {});

		const selectFrameworks = [new Framework({ name: "none", slug: "none", isPrivate: false })];
		if (!isEmpty(frameworks)) selectFrameworks.push(...frameworks);
		// log({ selectFrameworks });

		const { framework } = await inquirer.prompt({
			type: "list",
			name: "framework",
			message: "Select starting framework:",
			default: "none",
			choices: selectFrameworks.map((fw) => {
				return { name: fw.name, value: fw };
			}),
		});

		options.framework = framework;
		curFramework = framework;
	}

	// Check git provider authentication
	const { gitProvider: frameworkGitProvider, isPrivate, slug, repoSSH } = options.framework;
	if (slug !== "none") {
		const { namespace } = getGitRepoDataFromRepoSSH(repoSSH);
		if (!isPrivate) {
			const canAccessPublicRepo = await checkGitProviderAccess(frameworkGitProvider);
			if (!canAccessPublicRepo) {
				logError(`You need to authenticate ${upperFirst(frameworkGitProvider)} first to be able to pull this framework.`);
				return;
			}
		} else {
			const canAccessPrivateRepo = await checkGitRepoAccess(repoSSH);
			if (!canAccessPrivateRepo) {
				logError(`You may not have access to this private repository or ${namespace} organization, please authenticate first.`);
				return;
			}
		}
	}

	// Request select specific version
	const { frameworkVersion } = await inquirer.prompt({
		type: "input",
		name: "frameworkVersion",
		message: `Framework version:`,
		default: curFramework.mainBranch,
	});
	options.frameworkVersion = frameworkVersion;

	if (options.shouldUseGit) {
		let currentGitProvider;
		if (!options.gitProvider) {
			const gitProviders = await DB.find<GitProvider>("git-provider", {});
			if (isEmpty(gitProviders)) {
				logError(`This workspace doesn't have any git providers integrated.`);
				return;
			}

			const gitProviderChoices = [
				{ name: "none", value: { slug: "none" } },
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

			if (gitProvider.slug != "none") {
				currentGitProvider = gitProvider;
				options.gitProvider = gitProvider.slug;

				// set this git provider to default:
				saveCliConfig({ currentGitProvider });
			} else {
				options.shouldUseGit = false;
			}
		} else {
			// search for this git provider
			currentGitProvider = await DB.findOne<GitProvider>("git-provider", { slug: options.gitProvider });
			if (!currentGitProvider) return logError(`Git provider "${options.gitProvider}" not found.`);

			// set this git provider to default:
			saveCliConfig({ currentGitProvider });
		}
	}

	// Call API to create new app
	const appData = {
		name: options.name,
		createdBy: options.username,
		owner: options.userId,
		project: options.project._id,
		workspace: options.workspaceId,
	} as App;

	if (options.shouldUseGit) {
		appData.git.provider = options.gitProvider;
	}

	const newApp = await DB.create<App>("app", appData);
	if (!newApp) {
		logError(`Can't create new app due to network issue.`);
		return;
	}

	// to make sure it write down the correct app "slug" in "dx.json"
	options.slug = newApp.slug;
	options.name = newApp.name;

	return options;
}
