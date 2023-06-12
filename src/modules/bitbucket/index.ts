import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import inquirer from "inquirer";
import _ from "lodash";
import ora from "ora";
import path from "path";

const { Bitbucket } = require("bitbucket");

const copyFile = require("ncp").ncp;
const fs = require("fs");
const util = require("util");
const jsonDiff = require("json-diff");
var copy = require("recursive-copy");

const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);

import { simpleGit } from "simple-git";

import { isServerMode } from "@/app.config";
import type { InputOptions } from "@/interfaces/InputOptions";

// import { conf } from "../cli/update-cli";
import { deleteFolderRecursive, pullOrCloneGitRepo } from "../../plugins";

export let bitbucket, workspaceId;

// export var bitbucket;
export let auth = {
	username: "",
	password: process.env.BITBUCKET_PASSWORD || "",
};

export const packageDiff = () => {
	const curPackage = require(path.resolve("package.json"));
	const newPackage = require(path.resolve("./.fw/package.json"));
	const diff = jsonDiff.diff(curPackage, newPackage);

	return diff;
};

export const patchPackage = () => {
	const diff = packageDiff();
	const newPackage = require(path.resolve("./.fw/package.json"));

	let curPackage = require(path.resolve("./package.json"));

	curPackage.version = newPackage.version;

	log(diff);
	// log(diff.scripts);
	// log(Object.entries(diff.scripts));

	// scripts
	if (diff && diff.scripts) {
		for (let [key, val] of Object.entries(diff.scripts)) {
			if (key.includes("__added")) curPackage.scripts[key.split("__")[0]] = val;
			if (val.hasOwnProperty("__old")) curPackage.scripts[key] = (val as any).__new;
		}
	}

	// dependencies
	if (diff && diff.dependencies) {
		for (let [key, val] of Object.entries(diff.dependencies)) {
			// if (key.includes("__deleted")) {
			//   delete curPackage.dependencies[key.split("__")[0]];
			// }
			if (key.includes("__added")) {
				curPackage.dependencies[key.split("__")[0]] = val;
			}
			if (typeof val == "object" && val.hasOwnProperty("__old")) {
				curPackage.dependencies[key] = (val as any).__new;
			}
		}
	}

	// dev dependencies
	// log(diff.devDependencies);
	if (diff && diff.devDependencies) {
		for (let [key, val] of Object.entries(diff.devDependencies)) {
			// if (key.includes("__deleted")) {
			//   delete curPackage.devDependencies[key.split("__")[0]];
			// }
			if (key.includes("__added")) {
				curPackage.devDependencies[key.split("__")[0]] = val;
			}
			if (typeof val == "object" && val.hasOwnProperty("__old")) {
				curPackage.devDependencies[key] = (val as any).__new;
			}
		}
	}

	// browser list
	curPackage.browserlist = newPackage.browserlist;
	// log(curPackage);

	return curPackage;
};

export const copyAllResources = async (destDirectory: string) => {
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

export const pullMasterToCurrentBranch = async () => {
	const git = simpleGit("./", { binary: "git" });
	const gitStatus = await git.status(["-s"]);

	let currentBranch = gitStatus.current;
	let currentBranchKebab = _.kebabCase(currentBranch);

	// commit & push everything, then try to merge "master" to current branch
	if (currentBranch != "master") {
		const buildSpin = ora(`Merging "master" -> "${currentBranch}"...`).start();

		try {
			await git.add("./*");
			await git.commit("Stage all files for preparing deployment");
			await git.checkout("master");
			await git.pull();
			await git.checkout(currentBranch);
			await git.mergeFromTo("master", currentBranch);
			await git.commit(`Merged "master" -> "${currentBranch}" -> Ready to build "${currentBranch}"`);
			// await git.push();
		} catch (e) {
			logError(e);
		}

		buildSpin.stopAndPersist({
			symbol: "✌️ ",
			text: `Merged "master" -> "${currentBranch}" successfully!`,
		});
	}

	return { currentBranch, currentBranchKebab };
};

interface GitStageOptions {
	directory?: string;
	message?: string;
}

/**
 *
 */
export async function stageAllFiles(options: GitStageOptions) {
	const { directory = "./", message = "build(prepare): commit all files & push to origin" } = options;
	const git = simpleGit(directory, { binary: "git" });
	const gitStatus = await git.status(["-s"]);
	// log("[current branch]", gitStatus.current);

	const currentBranch = gitStatus.current;
	const currentBranchKebab = _.kebabCase(currentBranch);

	// commit & push everything, then try to merge "master" to current branch
	try {
		await git.pull("origin", currentBranch, ["--no-ff"]);
		await git.add("./*");
		await git.commit(message);
		await git.push("origin", currentBranch);
	} catch (e) {
		logError(e);
	}

	return { currentBranch, currentBranchKebab };
}

export const pullingLatestFrameworkVersion = async (options: InputOptions) => {
	// const repoSSH = `git@bitbucket.org:${config.workspace}/${config.framework[framework]}.git`;
	const { frameworkVersion } = options;
	const { name, repoSSH } = options.framework;

	// create tmp dir
	const tmpDir = path.resolve(".fw/");
	try {
		await deleteFolderRecursive(tmpDir);
	} catch (e) {
		logError(e);
	}
	await mkdir(tmpDir);

	const spin = ora(`Pulling "${name}" framework... 0%`).start();

	await pullOrCloneGitRepo(repoSSH, tmpDir, frameworkVersion, {
		onUpdate: (msg, progress) => {
			if (isServerMode) {
				console.log(msg);
			} else {
				spin.text = `Pulling "${name}" framework... ${progress || 0}%`;
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

/**
 * @deprecated
 * @param all
 */
export const patchResources = async (all = true) => {
	// await copyFile();
	const updateList = [
		"components/admin",
		"components/dashkit",
		"components/diginext",
		// "deployment/Dockerfile",
		"plugins",
		"optimizer",
		"modules",
		".babelrc",
		// ".gitignore",
		// ".dockerignore",
		".env.example",
		// "docker-compose.yaml",
		"jsconfig.json",
		"next.config.js",
		// "next.config_three.js",
		"git.js",
		"polyfills.js",
		"postcss.config.js",
		// "postinstall.js",
		"server.js",
		"server.dev.js",
		"web.config.js",
	];

	if (all) {
		await Promise.all(
			updateList.map((f) => {
				return copyFile(path.join("./.fw", f), path.join("./", f));
			})
		);
	} else {
		// hỏi trước
		const questions = [];

		updateList.map((f, i) => {
			questions.push({
				type: "confirm",
				name: `answer-${i}`,
				message: `Bạn có muốn cập nhật "${f}" không?`,
				default: true,
			});
		});

		const confirms = await inquirer.prompt(questions);
		// log("confirms", confirms);

		// sau đó mới copy files:
		await Promise.all(
			updateList.map(async (f, i) => {
				if (confirms[`answer-${i}`]) {
					return copyFile(path.join("./.fw", f), path.join("./", f));
				}
			})
		);
	}
};

export const writeConfigFiles = async (diginextContent, packageContent) => {
	await writeFile(path.resolve("package.json"), JSON.stringify(packageContent, null, 2), "utf8");
	await writeFile(path.resolve("dx.json"), JSON.stringify(diginextContent, null, 2), "utf8");
};

export const installPackages = async () => {
	log(`Đang tiến hành cài đặt "package.json" mới...`);

	let areDependenciesInstalled = false;
	// Install dependencies
	try {
		await execa("yarn", ["install"]);
		// console.log(stdout);
		areDependenciesInstalled = true;
	} catch (e) {
		logWarn("YARN not found, switch to `npm install` instead.");
	}

	if (!areDependenciesInstalled) {
		let isOk;
		try {
			await execa("npm", ["install"]);
			isOk = true;
		} catch (e) {
			logError("NPM not found -> ", e);
			isOk = false;
		}
		return isOk;
	} else {
		return true;
	}
};

export const cleanUp = async () => {
	// clean up
	try {
		await deleteFolderRecursive("./.fw");
	} catch (e) {
		logError("CLEANUP", e);
	}
};
