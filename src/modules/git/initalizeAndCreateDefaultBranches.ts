// import { log } from "diginext-utils/dist/xconsole/log";
import Timer from "diginext-utils/dist/Timer";
import { log } from "diginext-utils/dist/xconsole/log";
import * as fs from "fs";
import path from "path";
import { simpleGit } from "simple-git";

import type InputOptions from "@/interfaces/InputOptions";
import updateBranchProtection from "@/modules/git/updateBranchProtection";
import { wait } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

export const initalizeAndCreateDefaultBranches = async (options: InputOptions) => {
	if (options.isDebugging) console.log("initalizeAndCreateDefaultBranches > directory :>> ", options.targetDirectory);
	if (options.isDebugging) console.log("initalizeAndCreateDefaultBranches > repoSSH :>> ", options.repoSSH);

	try {
		// Remove current git (if any) & initialize new git...
		const gitDir = path.resolve(options.targetDirectory, ".git/");
		if (fs.existsSync(gitDir)) fs.rmSync(gitDir, { recursive: true, force: true });

		// Initialize local git...
		const git = simpleGit(options.targetDirectory);
		await git.init();

		// create "main" branch
		await git.checkout(["-b", "main"]);

		// just to make sure the remote git is ready...
		await wait(1000);

		// add git origin remote:
		await git.addRemote("origin", options.repoSSH);

		// stage all deployment files & commit it
		await git.fetch(["--all"]);
		await git.add(".");
		await git.commit("feat(initial): initial commit");

		// debug
		if (options.isDebugging) {
			const branch = await git.branch();
			log("initalizeAndCreateDefaultBranches > branch.current :>> ", branch?.current);

			const remote = await git.remote(["-v"]);
			log("initalizeAndCreateDefaultBranches > remote :>> ", remote);
		}

		await git.push(["--set-upstream", "origin", "main", "--force"]);

		// Update main branch protection
		(async () => {
			await Timer.wait(1000);
			await updateBranchProtection(options);
		})();

		// create developer branches
		const gitUsername = (await git.getConfig(`user.name`, "global")).value;
		const username = options.username || (gitUsername ? makeSlug(gitUsername).toLowerCase() : undefined) || "developer";
		const devBranch = `dev/${username}`;
		if (options.isDebugging) {
			console.log("initalizeAndCreateDefaultBranches > username :>> ", username);
			console.log("initalizeAndCreateDefaultBranches > devBranch :>> ", devBranch);
		}
		await git.checkout(["-b", devBranch]);
		await git.push(["--set-upstream", "origin", devBranch, "--force"]);

		if (options.isDebugging) console.log(`✅ Finished initializing git!`);

		return options;
	} catch (error) {
		throw new Error(`[GIT] Unable to initialize default branches: ${error}`);
	}
};
