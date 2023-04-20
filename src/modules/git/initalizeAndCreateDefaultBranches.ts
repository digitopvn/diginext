// import { log } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import path from "path";
import { simpleGit } from "simple-git";

import type InputOptions from "@/interfaces/InputOptions";

export const initalizeAndCreateDefaultBranches = async (options: InputOptions) => {
	// console.log("options.username :>> ", options.username);

	// Remove current git & initialize new git...
	const gitDir = path.resolve(options.targetDirectory, ".git/");
	if (fs.existsSync(gitDir)) fs.rmSync(gitDir, { recursive: true, force: true });

	// Initialize local git...
	const git = simpleGit(options.targetDirectory, { binary: "git" });
	await git.init();

	// create default brand: "main"
	await git.fetch(["--all"]);
	await git.checkout(["-b", "main"]);

	// stage all deployment files & commit it
	await git.add(".");
	await git.commit("feat(initial): initial commit");

	// // create developer branches
	// await git.checkout(["-b", `dev/${options.username}`]);

	// log(`Finished initializing git!`);

	return options;
};
