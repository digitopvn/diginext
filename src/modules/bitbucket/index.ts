import { log, logError } from "diginext-utils/dist/xconsole/log";
import fs from "fs";
import inquirer from "inquirer";
import jsonDiff from "json-diff";
import _ from "lodash";
import { ncp as copyFile } from "ncp";
import ora from "ora";
import path from "path";
import util from "util";

const writeFile = util.promisify(fs.writeFile);

import { simpleGit } from "simple-git";

export let bitbucket, workspaceId;

// export var bitbucket;
export let auth = {
	username: "",
	password: process.env.BITBUCKET_PASSWORD || "",
};

export const packageDiff = async () => {
	const curPackage = await import(path.resolve("package.json"));
	const newPackage = await import(path.resolve("./.fw/package.json"));
	const diff = jsonDiff.diff(curPackage, newPackage);

	return diff;
};

export const patchPackage = async () => {
	const diff = await packageDiff();
	const newPackage = await import(path.resolve("./.fw/package.json"));

	let curPackage = await import(path.resolve("./package.json"));

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
