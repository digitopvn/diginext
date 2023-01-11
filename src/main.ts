import chalk from "chalk";
import Configstore from "configstore";
import { log, logWarn } from "diginext-utils/dist/console/log";
import path from "path";
import type { SimpleGit } from "simple-git";

import pkg from "@/../package.json";
import { CLI_DIR } from "@/config/const";

export const GENERAL_GITIGNORE_TEMPLATE = path.resolve(CLI_DIR, "templates/gitignore.txt");
export const DIGINEXT_GITIGNORE_TEMPLATE_PATH = path.resolve(CLI_DIR, "templates/diginext/gitignore.txt");
export const DIGINEST_GITIGNORE_TEMPLATE_PATH = path.resolve(CLI_DIR, "templates/diginest/gitignore.txt");

if (typeof process.env.RUNTIME_ENV !== "undefined") log(chalk.red(`ENV=${process.env.RUNTIME_ENV}`));

export let git: SimpleGit;

export const conf = new Configstore(pkg.name);

// var auth = {};
export const projectSlug = "";
export const remoteURL = "";
export const repoURL = "";
export let cdnDevHost = "";
export let cdnProdHost = "";
export let cdnDevHostNoCache = "";
export let cdnProdHostNoCache = "";

export const inputOptions = {};

/**
 * Update current CLI version
 */
export const updateCli = async (version = "master") => {
	// TODO: Update CLI by `npm install -g diginext-cli`

	logWarn(`This feature is under development.`);

	// const cliDir = path.resolve(__dirname, "..");
	// const cliGit = simpleGit(cliDir, { binary: "git" });

	// await cliGit.fetch();
	// await cliGit.checkout(version);
	// await cliGit.pull(["--rebase=merges"]);

	// try {
	// 	await execa.command(`cd "${cliDir}" && yarn`, { stdio: "inherit" });
	// } catch (e) {
	// 	logWarn(e);
	// 	try {
	// 		await execa.command(`cd "${cliDir}" && npm install`, { stdio: "inherit" });
	// 	} catch (_e) {
	// 		logWarn(_e);
	// 	}
	// }

	// const newPkg = require("@/../package.json");
	// const msg = `${chalk.yellow("Diginext CLI")} vừa được cập nhật lên "${newPkg.version}".`;
	// logInfo(msg);

	return true;
};
