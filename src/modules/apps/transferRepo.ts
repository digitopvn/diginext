import chalk from "chalk";
import console from "console";
import { logError } from "diginext-utils/dist/xconsole/log";
import * as fs from "fs";
import path from "path";

import type { InputOptions } from "@/interfaces";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import selectApp from "@/modules/apps/selectApp";
import selectProject from "@/modules/apps/selectProject";
import { pullingRepoToNewGitDir } from "@/modules/framework";
import { askForGitProvider } from "@/modules/git/ask-for-git-provider";
import type { GitRepositoryDto } from "@/modules/git/git-provider-api";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import { printInformation } from "@/modules/project/printInformation";
import { wait } from "@/plugins";

//
export default async function transferRepo(options: InputOptions) {
	options.project = await selectProject(options, false);
	options.app = await selectApp(options, false);

	console.log(chalk.yellow("Chọn git provider muốn clone đến (Đừng chọn bitbucket, chưa test! )"));

	const oldData = {
		provider: options.app.git.provider,
		repoSSH: options.app.git.repoSSH,
		repoURL: options.app.git.repoURL,
	};
	// console.log("oldData :>> ", oldData);
	// console.log("options :>> ", options);
	// {
	// 	// Repo URL   : https://bitbucket.org/digitopvn/test-project-gaol-webapp
	// 	// Remote SSH : git@bitbucket.org:digitopvn/test-project-gaol-webapp.git
	// 	const [updatedApp] = await DB.update(
	// 		"app",
	// 		{ slug: options.slug },
	// 		{
	// 			git: {
	// 				//
	// 				provider: "bitbucket",
	// 				repoSSH: "git@bitbucket.org:digitopvn/test-project-gaol-webapp.git",
	// 				repoURL: "https://bitbucket.org/digitopvn/test-project-gaol-webapp",
	// 			},
	// 		}
	// 	);

	// 	console.log("updatedApp :>> ", updatedApp);
	// }
	// return;

	let gitProvider = await askForGitProvider();

	options.targetDirectory = path.resolve(process.cwd(), options.repoSlug);

	if (fs.existsSync(options.targetDirectory)) {
		if (options.overwrite) {
			fs.rmSync(options.targetDirectory, { recursive: true, force: true });
		} else {
			logError(`App directory with name "${options.slug}" was already existed.`);
			return;
		}
	}

	if (!fs.existsSync(options.targetDirectory)) fs.mkdirSync(options.targetDirectory);

	const __option = {
		framework: {
			...options.app.framework,
			...options.app?.git,
			name: options.app?.git?.repoSSH,
		},

		targetDirectory: options.targetDirectory,
	};

	const success = await pullingRepoToNewGitDir(__option);
	if (!success) return;

	await wait(500);
	// //create git in github

	// Create new repo:
	const repoData: GitRepositoryDto = {
		name: options.repoSlug,
		private: !options.isPublic,
	};
	if (options.isDebugging) console.log("[cloneRepo] CREATE REPO > repoData :>> ", repoData);

	if (options.app.git.provider != gitProvider.type) {
		//

		const { DB } = await import("@/modules/api/DB");
		const newRepo = await DB.create("git_repo", repoData, {
			subpath: "/orgs/repos",
			filter: { slug: gitProvider.slug },
		});
		if (options.isDebugging) console.log("[cloneRepo] CREATE REPO > newRepo :>> ", newRepo);

		if (newRepo) {
			options.gitProvider = newRepo.provider;
			options.repoSSH = newRepo.ssh_url;
			options.repoURL = newRepo.repo_url;
		} else {
			options.gitProvider = gitProvider.type;
			options.repoSSH = `git@github.com:digitopvn/${options.repoSlug}.git`;
			options.repoURL = `https://github.com/digitopvn/${options.repoSlug}.git`;
		}

		// update git info to database
		const [updatedApp] = await DB.update(
			"app",
			{ slug: options.slug },
			{ git: { provider: options.gitProvider, repoSSH: options.repoSSH, repoURL: options.repoURL } }
		);
		if (!updatedApp) {
			logError("Can't create new app due to network issue while updating git repo info.");
			return;
		}
	} else {
		options.gitProvider = options.app.git.provider;
		options.repoSSH = options.app.git.repoSSH;
		options.repoURL = options.app.git.repoURL;
	}

	options.app.git = {
		provider: options.gitProvider,
		repoSSH: options.repoSSH,
		repoURL: options.repoURL,
	};

	const { DB } = await import("@/modules/api/DB");
	// return;
	// // first commit & create default branches (main, dev/*)
	const error = await initalizeAndCreateDefaultBranches(options);
	if (error) {
		// update git info to database
		const [updatedApp] = await DB.update(
			"app",
			{ slug: options.slug },
			{
				git: {
					...oldData,
				},
			}
		);
		return;

		// error
	}

	// print project information:
	const finalConfig = getAppConfigFromApp(options.app);
	printInformation(finalConfig);
}
export { transferRepo as cloneRepo };
