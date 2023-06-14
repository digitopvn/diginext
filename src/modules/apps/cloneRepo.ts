import { logError } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import path from "path";

import type { IApp } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import { getAppConfigFromApp } from "@/modules/apps/app-helper";
import selectApp from "@/modules/apps/selectApp";
import selectProject from "@/modules/apps/selectProject";
import { pullingRepoToNewGitDir } from "@/modules/framework";
import { askForGitProvider } from "@/modules/git/ask-for-git-provider";
import type { GitRepository, GitRepositoryDto } from "@/modules/git/git-provider-api";
import { initalizeAndCreateDefaultBranches } from "@/modules/git/initalizeAndCreateDefaultBranches";
import { printInformation } from "@/modules/project/printInformation";

//
export default async function cloneRepo(options: InputOptions) {
	options.project = await selectProject(options, false);
	options.app = await selectApp(options, false);
	console.log("Chọn git provider muốn clone đến (Đừng chọn bitbucket, chưa test! )");
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

	await pullingRepoToNewGitDir(__option);

	// //create git in github

	// Create new repo:
	const repoData: GitRepositoryDto = {
		name: options.repoSlug,
		private: !options.isPublic,
	};
	if (options.isDebugging) console.log("[cloneRepo] CREATE REPO > repoData :>> ", repoData);
	const newRepo = await DB.create<GitRepository>("git", repoData, {
		subpath: "/orgs/repos",
		filter: { slug: gitProvider.slug },
	});
	if (options.isDebugging) console.log("[cloneRepo] CREATE REPO > newRepo :>> ", newRepo);

	options.gitProvider = newRepo.provider;
	options.remoteSSH = newRepo.ssh_url;
	options.remoteURL = newRepo.repo_url;

	// update git info to database
	const [updatedApp] = await DB.update<IApp>(
		"app",
		{ slug: options.slug },
		{ git: { provider: options.gitProvider, repoSSH: options.remoteSSH, repoURL: options.remoteURL } }
	);
	if (!updatedApp) {
		logError("Can't create new app due to network issue while updating git repo info.");
		return;
	}

	// // first commit & create default branches (main, dev/*)
	await initalizeAndCreateDefaultBranches(options);

	// print project information:
	const finalConfig = getAppConfigFromApp(updatedApp);
	printInformation(finalConfig);
}
export { cloneRepo };
