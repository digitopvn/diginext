// import { log } from "diginext-utils/dist/xconsole/log";
import * as fs from "fs";
import path from "path";
import { simpleGit } from "simple-git";

import type InputOptions from "@/interfaces/InputOptions";
import { wait } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

export const initalizeAndCreateDefaultBranches = async (options: InputOptions) => {
	// console.log("options.username :>> ", options.username);

	// Remove current git & initialize new git...
	const gitDir = path.resolve(options.targetDirectory, ".git/");
	if (fs.existsSync(gitDir)) fs.rmSync(gitDir, { recursive: true, force: true });

	// Initialize local git...
	const git = simpleGit(options.targetDirectory, {
		baseDir: `${options.targetDirectory}`,
		binary: "git",
	});
	await git.init();

	// create main
	await git.checkout(["-b", "main"]);

	// make sure the remote git is ready...
	await wait(1000);

	// add git origin:
	await git.addRemote("origin", options.remoteSSH);

	// create default brand: "main"
	await git.fetch(["--all"]);

	// stage all deployment files & commit it
	await git.add(".");
	await git.commit("feat(initial): initial commit");
	await git.push(["-u", "origin", "main"]);

	// create developer branches
	const gitUsername = (await git.getConfig(`user.name`, "global")).value;
	const username = options.username || (gitUsername ? makeSlug(gitUsername).toLowerCase() : undefined) || "developer";
	const devBranch = `dev/${username}`;
	await git.checkout(["-b", devBranch]);
	await git.push("origin", devBranch);

	// log(`Finished initializing git!`);

	return options;
};
