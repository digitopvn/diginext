import detectPrivateKey from "diginext-utils/dist/file/detectPrivateKey";
import { log, logError } from "diginext-utils/dist/xconsole/log";
import fs from "fs";
import { mkdir } from "fs/promises";
import ora from "ora";
import path from "path";
import copy from "recursive-copy";

import { isServerMode } from "@/app.config";
import type { InputOptions } from "@/interfaces/InputOptions";
import { cloneGitRepo, deleteFolderRecursive, pullOrCloneGitRepo, wait } from "@/plugins";

/**
 * Delete temporary directory of the framework
 */
export const cleanUpFramework = async () => {
	// clean up
	try {
		await deleteFolderRecursive("./.fw");
	} catch (e) {
		logError("CLEANUP", e);
	}
};

/**
 * Copy all framework's files to application directory
 * @param destDirectory - Destination application directory
 */
export const copyFrameworkResources = async (destDirectory: string) => {
	let options = {
		overwrite: true,
		expand: true,
		dot: true,
		junk: true,
		// filter: ["**/*", "!.git"],
	};

	let success = false;
	try {
		const tmpFrameworkDir = path.resolve(".fw");
		await copy(tmpFrameworkDir, destDirectory, options);
		success = true;
	} catch (e) {
		logError(e);
	}

	return success;
};

export const getLatestFrameworkVersion = async (framework = "diginext") => {
	// let { data } = await bitbucket.repositories.listTags({
	// 	repo_slug: config.framework[framework],
	// 	workspace: config.workspace,
	// 	sort: "-name",
	// });
	// if (typeof data.values == "undefined" || data.values.length == 0) {
	// 	logError(`This framework repository doesn't have any released tags.`);
	// 	return;
	// }
	// // exclude "beta" and "alpha" tags
	// let versionList = (data.values || [{ name: "main" }]).filter((ver) => !ver.name.includes("beta"));
	// return versionList && versionList.length > 0 ? versionList[0].name : "main";
};

export const getFrameworkVersions = async (framework = "diginext") => {
	// let { data } = await bitbucket.repositories.listTags({
	// 	repo_slug: config.framework[framework],
	// 	workspace: config.workspace,
	// 	sort: "-name",
	// });
	// if (typeof data.values == "undefined" || data.values.length == 0) {
	// 	logError(`This framework repository doesn't have any released tags.`);
	// 	return;
	// }
	// return data.values;
};

export const selectFrameworkVersion = async (framework = "diginext") => {
	// TODO: What the fuck is this??
	// let { data } = await bitbucket.repositories.listTags({
	// 	repo_slug: config.framework[framework],
	// 	workspace: config.workspace,
	// 	sort: "-name",
	// });
	// let versionList = typeof data.values != undefined && data.values.length > 0 ? [...data.values] : ["main"];
	// return versionList;
};

export interface PullFrameworkVersion extends Pick<InputOptions, "framework" | "frameworkVersion" | "name" | "repoSSH" | "ci"> {}

export const pullFrameworkVersion = async (options: PullFrameworkVersion) => {
	const { frameworkVersion } = options;
	const { name, repoSSH } = options.framework;

	const spin = ora(`Pulling "${name}" framework... 0%`).start();

	// create tmp dir
	const tmpDir = path.resolve(".fw/");
	try {
		await deleteFolderRecursive(tmpDir);
	} catch (e) {
		logError(e);
	}
	await mkdir(tmpDir, { recursive: true });

	// pull or clone git repo
	await pullOrCloneGitRepo(repoSSH, tmpDir, frameworkVersion, {
		onUpdate: (msg, progress) => {
			if (isServerMode) {
				console.log(msg);
			} else {
				spin.text = `Pulling "${name}" framework... ${progress || 0}%`;
			}
		},
		// delete framework git
		removeGitOnFinish: true,
		removeCIOnFinish: !options.ci,
	});

	spin.stop();

	// delete unneccessary files
	// if (fs.existsSync(".fw/README.md")) fs.unlinkSync(".fw/README.md");
	// if (fs.existsSync(".fw/CHANGELOG.md")) fs.unlinkSync(".fw/CHANGELOG.md");
	// if (fs.existsSync(".fw/package-lock.json")) fs.unlinkSync(".fw/package-lock.json");
	// if (fs.existsSync(".fw/yarn.lock")) fs.unlinkSync(".fw/yarn.lock");

	return true;
};

export async function pullingFramework(options: InputOptions) {
	if (options.framework.name != "none") {
		// TODO: Select specific branch as a version?

		await pullFrameworkVersion(options);

		await copyFrameworkResources(options.targetDirectory);

		await cleanUpFramework();
	}

	return true;
}

export const cloneGitFramework = async (options: InputOptions) => {
	//
	const { name, repoSSH } = options.framework;

	// create tmp dir
	const tmpDir = path.resolve(".fw/");
	try {
		await deleteFolderRecursive(tmpDir);
	} catch (e) {
		logError(e);
	}
	await mkdir(tmpDir);

	const spin = ora(`Pulling "${name}"... 0%`).start();

	await cloneGitRepo(repoSSH, tmpDir, {
		onUpdate: (msg, progress) => {
			if (isServerMode) {
				console.log(msg);
			} else {
				spin.text = `Pulling "${name}"... ${progress || 0}%`;
			}
		},
	});

	spin.stop();

	// delete unneccessary files
	if (fs.existsSync(".fw/dx.json")) await deleteFolderRecursive(".fw/dx.json");
	if (fs.existsSync(".fw/.git")) await deleteFolderRecursive(".fw/.git");
	if (fs.existsSync(".fw/README.md")) fs.unlinkSync(".fw/README.md");
	if (fs.existsSync(".fw/CHANGELOG.md")) fs.unlinkSync(".fw/CHANGELOG.md");
	if (fs.existsSync(".fw/package-lock.json")) fs.unlinkSync(".fw/package-lock.json");
	if (fs.existsSync(".fw/yarn.lock")) fs.unlinkSync(".fw/yarn.lock");
	if (fs.existsSync(".fw/logo.png")) fs.unlinkSync(".fw/logo.png");

	return true;
};

export async function pullingRepoToNewGitDir(options: InputOptions) {
	await cloneGitFramework(options);

	await wait(500);

	await copyFrameworkResources(options.targetDirectory);

	await wait(500);

	await cleanUpFramework();

	const result = detectPrivateKey(options.targetDirectory);
	if (result.status) {
		//
	} else {
		//
		logError("FOUND PRIVATE KEY OR SECRET ENV, PLEASE IGNORE THEM BEFORE PUSH TO GIT!");
		log(result.list);
		return false;
	}

	return true;
}
