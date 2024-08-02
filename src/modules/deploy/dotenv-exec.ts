import chalk from "chalk";
import { logError, logWarn } from "diginext-utils/dist/xconsole/log";
import { existsSync, readFileSync } from "fs";
import { last } from "lodash";
import path from "path";
import yargs from "yargs";

import type { InputOptions } from "@/interfaces";

import { downloadDotenv } from "./dotenv-download";
import { uploadDotenvFile } from "./dotenv-upload";

type DotenvUtilsOptions = {
	/**
	 * Location to write down the dotenv file
	 * @default process.cwd()
	 */
	targetDir?: string;
};

export const checkGitignoreContainsDotenvFiles = async (options: DotenvUtilsOptions = {}) => {
	const { targetDir = process.cwd() } = options;
	const { globby } = await import("globby");
	const allDotenvFiles = await globby(targetDir + "/.env*");
	const fileNames = allDotenvFiles.map((filePath) => last(filePath.split("/")));

	const gitignoreFile = path.resolve(targetDir, ".gitignore");
	if (!existsSync(gitignoreFile)) {
		logWarn(`".gitignore" file not found.`);
		return;
	}

	const gitignoreContent = readFileSync(gitignoreFile, "utf8");

	let isContainAll = true;
	const results = fileNames
		.filter((dotenvName) => dotenvName !== ".env.sample" && dotenvName !== ".env.example" && dotenvName !== ".env.template")
		.map((dotenvName) => {
			if (gitignoreContent.indexOf(dotenvName) === -1) isContainAll = false;
			const isContained = gitignoreContent.indexOf(dotenvName) > -1;
			if (!isContained) {
				logWarn(`⚠️ "${dotenvName}" should be added to ".gitignore":`, chalk.cyan("https://salferrarello.com/add-env-to-gitignore/"));
			}
			return { name: dotenvName, isContained };
		});

	return { isContainAll, results };
};

export const execDotenvCommand = async (options?: InputOptions) => {
	const { secondAction, env, filePath, targetDirectory = process.cwd() } = options;

	switch (secondAction) {
		// take down the whole project & all of its apps
		case "push":
		case "up":
		case "upload":
			try {
				await uploadDotenvFile(env, { targetDir: targetDirectory, fileName: filePath, isDebugging: options?.isDebugging });
			} catch (e) {
				logError(e);
			}
			break;

		// take down the whole app & all of its environments
		case "pull":
		case "down":
		case "download":
			try {
				await downloadDotenv(env, { targetDir: targetDirectory, fileName: filePath, isDebugging: options?.isDebugging });
			} catch (e) {
				logError(e);
			}
			break;

		// show help
		default:
			yargs.showHelp();
			break;
	}
};
