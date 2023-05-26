import chalk from "chalk";
import { randomUUID } from "crypto";
// import { compareVersions } from "compare-versions";
import dayjs from "dayjs";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import dns from "dns";
import dotenv from "dotenv";
import execa from "execa";
import * as fs from "fs";
import * as afs from "fs/promises";
import yaml from "js-yaml";
import _, { isArray, isEmpty, isString, toNumber } from "lodash";
import * as m from "marked";
import TerminalRenderer from "marked-terminal";
import path from "path";
import type { SimpleGit, SimpleGitProgressEvent } from "simple-git";
import { simpleGit } from "simple-git";

import pkg from "@/../package.json";
import { cliOpts } from "@/config/config";
import type { AccessTokenInfo, IUser, IWorkspace } from "@/entities";
import type { AppConfig } from "@/interfaces/AppConfig";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { generateRepoURL } from "@/modules/git";
import { getCurrentGitBranch } from "@/modules/git/git-utils";

import { DIGITOP_CDN_URL, HOME_DIR } from "../config/const";
import { MongoDB } from "./mongodb";
import { checkMonorepo } from "./monorepo";
import { isNumeric } from "./number";
import { isWin } from "./os";
// import cliMd from "@/plugins/cli-md";

const { marked } = m;
marked.setOptions({ renderer: new TerminalRenderer() });

const CLI_DIR = path.resolve(__dirname, "../../");

export function nowStr() {
	return dayjs().format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Delay/wait a specific miliseconds
 * @param i - waiting time in miliseconds
 * @param exec - callback function
 */
const wait = async function (i: number = 100, exec?: any) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			try {
				if (exec) exec();
				resolve(true);
			} catch (e) {
				reject(e);
			}
		}, i);
	});
};

/**
 * Wait until a condition is matched
 * @param condition - Condition
 * @param interval - Re-check interval in seconds @default 10
 * @param maxWaitingTime - Max waiting time in seconds @default 30 minutes (30 * 60 = 1.800 seconds)
 */
export async function waitUntil(condition: Function, interval: number = 10, maxWaitTime: number = 30 * 60 * 1000) {
	let timeWaited = 0;
	while (timeWaited < maxWaitTime) {
		const conditionMet = await condition();
		if (conditionMet) {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, interval * 1000));
		timeWaited += interval;
	}
	return false;
}

async function logBitbucket(title, message, delay) {
	if (delay) await wait(delay);
	console.log(chalk.yellow("====== [BITBUCKET: " + title + "] ======"));
	console.log(message);
	process.exit(1);
}

export const readJson = (filePath) => {
	const jsonContent = fs.readFileSync(filePath).toString();
	try {
		return JSON.parse(jsonContent);
	} catch (e) {
		logWarn(e);
		return {};
	}
};

export type SaveJsonOptions = { overwrite?: boolean; beautify?: boolean };

export const saveJson = (data: string | any, filePath: string, options: SaveJsonOptions = {}) => {
	const { overwrite = false, beautify = true } = options;
	let jsonContent = typeof data == "string" ? data : JSON.stringify(data);
	if (beautify) jsonContent = JSON.stringify(JSON.parse(jsonContent), null, 4);

	const fileExisted = fs.existsSync(filePath);

	if (fileExisted && !overwrite) {
		try {
			return JSON.parse(fs.readFileSync(filePath).toString());
		} catch (e) {
			logWarn(`FILE_EXISTED >`, e);
			return {};
		}
	}

	try {
		fs.writeFileSync(filePath, jsonContent, "utf8");
		return JSON.parse(jsonContent);
	} catch (e) {
		logWarn(`WRITE_ERROR >`, e);
		return {};
	}
};

export const showDocs = async (filePath: string) => {
	// const cliMd = await importEsm("cli-markdown", module);
	// console.log("cliMd :>> ", cliMd);
	const content = await afs.readFile(filePath, "utf8");
	log(marked(content));
	// log(cliMd(content));
	return content;
};

/**
 * Create temporary file with provided content
 * @param fileName - File name (include the extension)
 * @param content - Content of the file
 * @returns Path to the file
 */
export const createTmpFile = (
	fileName: string,
	content: string,
	options: { recursive?: boolean; encoding?: BufferEncoding } = { recursive: true, encoding: "utf8" }
) => {
	const { encoding, recursive } = options;

	const tmpDir = path.resolve(HOME_DIR, `tmp/${makeDaySlug({ divider: "" })}`);
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive });

	const tmpFilePath = path.resolve(tmpDir, fileName);
	fs.writeFileSync(tmpFilePath, content, encoding);

	return tmpFilePath;
};

/**
 * Convert string-array-like to array
 * @example "1" -> ["1"] | "123,555,abc,def" -> ["123","555","abc","def"]
 */
export const stringToArray = (
	str: string,
	options: {
		/**
		 * Convert items to number if it's valid
		 * @default false
		 * @example "1,a,2" -> [1, "a", 2]
		 */
		typeTransform?: boolean;
		/**
		 * @default ","
		 */
		divider?: string;
	} = { typeTransform: false, divider: "," }
) => {
	const { typeTransform = false, divider = "," } = options;
	const arr = str.indexOf(divider) === -1 ? [str] : str.split(divider);
	return typeTransform ? arr.map((item) => (isNumeric(item) ? toNumber(item) : item)) : arr;
};

/**
 * Get full name of the environment, such as: `development`, `production` (instead of `dev`, `prod`)
 * @param {String} env
 * @returns {String}
 */
export const getLongEnv = (env) => {
	if (env == "dev") {
		return "development";
	} else if (env == "prod") {
		return "production";
	} else if (env == "cana") {
		return "canary";
	} else if (env == "stag") {
		return "staging";
	} else {
		return env;
	}
};

/**
 * @param  {String} filePath
 * @param  {[{keyword:(RegExp|String), replacement:String}]} replacement=[]
 * @return {String} - New content
 */
export const replaceInFile = async (filePath, replacement = []) => {
	let fileContent = fs.readFileSync(filePath, "utf-8");
	replacement.forEach(({ keyword, replacement: replaceWith }) => {
		fileContent = fileContent.replace(keyword, replaceWith);
	});
	fs.writeFileSync(filePath, fileContent, "utf8");
	return fileContent;
};

function toBase64(str) {
	return Buffer.from(str).toString("base64");
}

export function printHelp(options?: InputOptions) {
	console.info(chalk.yellow(`[Diginext CLI - v${pkg.version}] USAGE DOCUMENTATION:`));
	console.info(pkg.description);

	console.info(chalk.redBright("\n  [TIPS] Alternatively you can use 'dx' as an alias of 'diginext' command (for faster typing):"));
	console.info("\n" + chalk.gray("  # This command:"));
	console.info(" ", chalk.yellow("diginext"), "--help");
	console.info(chalk.gray("  # is equivalent with:"));
	console.info(" ", chalk.yellow("dx"), "--help");

	console.info(chalk.yellowBright("\n  Create new project:"));
	console.info("  diginext new");

	console.info(chalk.yellowBright("\n  Force creating new project (overwrite the existing one):"));
	console.info("  diginext new --force");
	console.info("  diginext new --overwrite");

	console.info(chalk.yellowBright("\n  Initialize an existing project directory with our specific framework:"));
	console.info("  diginext init");

	// Update CLI
	console.info(chalk.yellowBright("\n  Update CLI:"));
	console.info("  diginext update");
	console.info("  diginext --update");
	console.info("  diginext -U");

	// CLOUD PROVIDERS
	console.info(chalk.yellowBright("\n  Connect to cloud providers (GCLOUD, Digital Ocean):"));
	console.info("  diginext gcloud auth -f", chalk.cyan("/path/to/service-account.json"));
	console.info("  diginext gcloud registry connect --host=", chalk.cyan("<GOOGLE_CONTAINER_REGISTRY_HOST>"));
	console.info(chalk.gray("  # GOOGLE_CONTAINER_REGISTRY_HOST should be one of: gcr.io, asia.gcr.io, eu.gcr.io, us.gcr.io"));
	console.info(chalk.gray("  # Learn more about Google Service Account: https://cloud.google.com/iam/docs/service-accounts"));
	console.info("  diginext do auth --key", chalk.cyan("<API_ACCESS_TOKEN>"));
	console.info("  diginext do registry connect");
	console.info(chalk.gray("  # Learn more about API_ACCESS_TOKEN: https://docs.digitalocean.com/reference/api/create-personal-access-token/"));

	console.info(chalk.yellowBright("\n  Deploy to DEVELOPMENT server:"));
	console.info(chalk.gray("  # Mặc định deploy lên môi trường DEV tại DEV3.DIGITOP.VN (Digital Ocean)"));
	console.info("  diginext deploy");
	console.info("  diginext deploy --dev");

	console.info(chalk.gray("\n  # Tương đương với"));
	console.info("  diginext deploy --do");
	console.info("  diginext deploy --provider=digitalocean");

	console.info(chalk.yellowBright("\n  Deploy to ANY ENVIRONMENTS: "));
	console.info(chalk.gray.italic(`  # Digital Ocean / DEV3.DIGITOP.VN:`));
	console.info("  diginext deploy --env=canary " + chalk.gray.italic(`--do`));

	console.info(chalk.gray.italic(`\n  # Google Cloud / DEV1.DIGITOP.VN:`));
	console.info("  diginext deploy --env=canary " + chalk.gray.italic(`--gcloud`));

	console.info(chalk.yellowBright("\n  Deploy to ANY PROVIDERS & ANY CLUSTERS: "));
	console.info(chalk.gray.italic(`  # Digital Ocean / cluster name "dev3-digitop-vn":`));
	console.info("  diginext deploy --do --cluster=dev3-digitop-vn");
	console.info(chalk.gray.italic(`\n  # Google Cloud / project name "top-group-k8s" / cluster name "digitop-cluster":`));
	console.info("  diginext deploy --gcloud --project=top-group-k8s --cluster=digitop-cluster");

	console.info(chalk.yellowBright("\n  Generate deployment YAML for different environments:"));
	console.info(chalk.gray.italic(`  # This command will take the "dx.json" configuration and`));
	console.info(chalk.gray.italic(`  # the according ENV files in "deployment" directory to generate K8S deployment YAML:`));
	console.info("  diginext deploy generate --prod");
	console.info("  diginext deploy generate --staging");
	console.info("  diginext deploy generate --env=staging");
	console.info("  diginext deploy generate --env=canary");

	console.info(chalk.yellowBright("\n  Push assets to CDN (dev):"));
	console.info(`  diginext cdn push ${chalk.cyan("[DIRECTORY]")}`);
	console.info(chalk.yellowBright("\n  Push assets to CDN (staging):"));
	console.info(`  diginext cdn push ${chalk.cyan("[DIRECTORY]")} --staging`);
	console.info(chalk.yellowBright("\n  Push assets to CDN (production):"));
	console.info(`  diginext cdn push ${chalk.cyan("[DIRECTORY]")} --prod`);
	console.info(chalk.yellowBright("\n  Push assets to CDN (any environments):"));
	console.info(`  diginext cdn push ${chalk.cyan("[DIRECTORY]")} --env=${chalk.cyan("[ENVIRONMENT_NAME]")}`);

	console.info(chalk.yellowBright("\n  Clear cache CDN of the current project (dev):"));
	console.info(`  diginext cdn purge ${chalk.cyan("[DIRECTORY]")}`);
	console.info(chalk.yellowBright("\n  Clear cache CDN of the current project (production):"));
	console.info(`  diginext cdn purge ${chalk.cyan("[DIRECTORY]")} --prod`);
	console.info(chalk.yellowBright("\n  Clear cache CDN (any environments):"));
	console.info(`  diginext cdn purge ${chalk.cyan("[DIRECTORY]")} --env=${chalk.cyan("[ENVIRONMENT_NAME]")}`);

	console.info(chalk.yellowBright("\n  Enable CDN in the project (dev):"));
	console.info("  diginext cdn enable");
	console.info(chalk.yellowBright("\n  Enable CDN in the project (staging):"));
	console.info("  diginext cdn enable --staging");
	console.info(chalk.yellowBright("\n  Enable CDN in the project (production):"));
	console.info("  diginext cdn enable --prod");
	console.info(chalk.yellowBright("\n  Enable CDN in the project (any environments):"));
	console.info(`  diginext cdn enable --env=${chalk.cyan("[ENVIRONMENT_NAME]")}`);

	console.info(chalk.yellowBright("\n  Disable CDN in the project (staging):"));
	console.info("  diginext cdn disable");
	console.info(chalk.yellowBright("\n  Disable CDN in the project (production):"));
	console.info("  diginext cdn disable --prod");
	console.info(chalk.yellowBright("\n  Disable CDN in the project (any environments):"));
	console.info(`  diginext cdn disable --env=${chalk.cyan("[ENVIRONMENT_NAME]")}`);

	console.info(chalk.yellowBright("\n  Login to Bitbucket:"));
	console.info("  diginext git login");
	console.info(chalk.yellowBright("\n  Log out current Bitbucket account:"));
	console.info("  diginext git logout");
	console.info(chalk.yellowBright("\n  Profile of current Bitbucket account:"));
	console.info("  diginext git profile");

	console.info(chalk.yellowBright("\n  List all recent active repositories:"));
	console.info("  diginext git repo");
	console.info("  diginext git repos");

	console.info(chalk.yellowBright("\n  Create pull request to another branch:"));
	console.info(`  diginext git pr ${chalk.cyan("[DESTINATION_BRANCH]")}`);

	console.info(chalk.yellowBright("\n  Create pull request to multiple branches: (use COMMA)"));
	console.info(`  diginext git pr ${chalk.cyan("[DEST_BRANCH_1],[DEST_BRANCH_2]")}`);

	console.info(chalk.yellowBright("\n  Create pull request & auto merge ") + chalk.redBright("(ONLY IF YOU ARE AN ADMIN)"));
	console.info(`  diginext git pr ${chalk.cyan("[DESTINATION_BRANCH]")} --merge`);

	console.info(chalk.yellowBright("\n  Create new database (DEV):"));
	console.info(`  diginext db new ${chalk.cyan("<db-name>")}`);
	console.info(chalk.yellowBright("\n  Create new database (PROD):"));
	console.info(`  diginext db new ${chalk.cyan("<db-name>")} --prod`);

	console.info(chalk.yellowBright("\n  Create default auth user (admin/Top@123#) to a database:"));
	console.info(`  diginext db add-default-user ${chalk.cyan("<db-name>")}`);

	console.info(chalk.yellowBright("\n  Create auth user with custom username/password to a database:"));
	console.info(`  diginext db add-user ${chalk.cyan("<db-name>")} ${chalk.cyan("<username>")} ${chalk.cyan("<password>")}`);
}

export function logVersion() {
	console.warn(chalk.bgWhite(chalk.bold(chalk.black(` [ Diginext CLI - v${pkg.version} | ${nowStr()} ] `))));
}

type ErrorCallback = (e: string) => void;

export async function execCmd(cmd: string, errorMsgOrCallback: string | ErrorCallback = "") {
	try {
		let { stdout } = await execa.command(cmd, cliOpts);
		// console.log(`[execCmd]`, { stdout });
		return stdout;
	} catch (e) {
		if (typeof errorMsgOrCallback == "string") {
			const errorMsg = errorMsgOrCallback;
			if (errorMsg != "") {
				logError(`${errorMsg} (${e.message})`);
			} else {
				logWarn(`[FAILED_BUT_IGNORE] ${e.message}`);
			}
			return;
		} else {
			// if it's a callback function
			try {
				errorMsgOrCallback(e);
			} catch (f) {
				logWarn(`[FAILED_BUT_IGNORE] ${f.message}`);
				return;
			}
		}
	}
}

export function currentVersion() {
	return pkg.version;
}

/**
 * Get latest tag of the git repository
 */
export async function getLatestTagOfGitRepo() {
	const git = simpleGit(CLI_DIR, { binary: "git" });
	const tags = (await git.tags(["--sort", "creatordate"])).all.filter((tag) => !tag.includes("beta"));
	return _.last(tags) as string;
}

/**
 * Get latest version of the CLI from NPM
 */
export async function getLatestCliVersion() {
	const latestVersion = await execCmd(`npm show ${pkg.name} version`);
	return latestVersion;
}

/**
 * Check if CLI version is latest or not, if not -> return FALSE
 */
export async function checkForUpdate() {
	const latestVersion = await getLatestCliVersion();
	return latestVersion !== currentVersion();
}

async function logBitbucketError(error: any, delay?: number, location?: string, shouldExit = false) {
	if (delay) await wait(delay);

	try {
		delete error.request.request;
	} catch (e) {}

	console.error(error);
	const errMsg = error.message ? error.message : error.error.message;
	const reason = error.error && error.error.error && error.error.error.fields ? error.error.error.fields : error.error.error.message;
	console.error(chalk.red(`[ERROR ${error.status}: ${errMsg} | ${nowStr()}]`));
	console.error(chalk.yellow("[REASON]"), reason);
	if (location) console.error(chalk.yellow("[LOCATION]"), location);
	console.error(error.request);
	if (shouldExit) process.exit(1);
}

export const parseRepoSlugFromUrl = (url) => {
	// https://digitop-duynguyen@bitbucket.org/digitopvn/diginext-cli.git
	let n = url.split("/").pop().split(".").shift();
	return n;
};

export const deleteFolderRecursive = async (dir: string) => {
	if (fs.existsSync(dir)) {
		// for (let entry of await afs.readdir(dir)) {
		// 	const filePath = path.resolve(dir, entry);
		// 	// use "unlink" to delete every single file
		// 	if ((await afs.lstat(filePath)).isDirectory()) await deleteFolderRecursive(filePath);
		// 	else await afs.unlink(filePath);
		// }
		// remove the directory itself
		await afs.rm(dir, { recursive: true, force: true });
	}
};

/**
 * Flatten the object into 1-level-object (with key paths)
 * @example {a: {b: [{c: 1}, {c: 2}]}, e: 3} -> {"a.b[0].c": 1, "a.b[1].c": 2, "e": 3}
 */
export function flattenObjectToPost(object: any = {}, initialPathPrefix = "") {
	if (!object || typeof object !== "object") return [{ [initialPathPrefix]: object }];

	const prefix = initialPathPrefix ? (Array.isArray(object) ? initialPathPrefix : `${initialPathPrefix}`) : "";

	const _arr = Object.entries(object).flatMap(([key]) =>
		flattenObjectToPost(object[key], Array.isArray(object) ? `${prefix}[${key}]` : `${prefix}[${key}]`)
	);
	// console.log("_arr :>> ", _arr);

	if (isEmpty(_arr)) return {};

	const res = _arr.reduce((acc, _path) => ({ ...acc, ..._path }));
	// console.log("res :>> ", res);

	return res;
}

/**
 * Flatten the object into 1-level-object (with key paths)
 * @example {a: {b: [{c: 1}, {c: 2}]}, e: 3} -> {"a.b.0.c": 1, "a.b.1.c": 2, "e": 3}
 */
export function flattenObjectPaths(object: any = {}, initialPathPrefix = "") {
	if (!object || typeof object !== "object") return [{ [initialPathPrefix]: object }];

	const prefix = initialPathPrefix ? (Array.isArray(object) ? initialPathPrefix : `${initialPathPrefix}.`) : "";

	const _arr = Object.entries(object).flatMap(([key]) =>
		flattenObjectPaths(object[key], Array.isArray(object) ? `${prefix}.${key}` : `${prefix}${key}`)
	);
	// console.log("_arr :>> ", _arr);

	if (isEmpty(_arr)) return {};

	const res = _arr.reduce((acc, _path) => ({ ...acc, ..._path }));
	// console.log("res :>> ", res);

	return res;
}

type SaveOpts = {
	/**
	 * Absolute path to project directory
	 */
	directory?: string;
	/**
	 * Set to `TRUE` will create new `dx.json` file if not existed.
	 */
	create?: boolean;
	ignoreIfNotExisted?: boolean;
};

/**
 * Get object of project configuration from "dx.json"
 * @param  {String} [directory] - Absolute path to project directory
 */
export const getAppConfig = (directory?: string) => {
	const filePath = path.resolve(directory || process.cwd(), "dx.json");

	if (!fs.existsSync(filePath)) return;

	const cfg = readJson(filePath);
	return cfg as AppConfig;
};

/**
 * Save object of project configuration to "dx.json"
 * @param  {Object} appConfig - Object data of the config
 * @param  {SaveOpts} [options] - Save options
 * @param  {String} [options.directory] - Absolute path to project directory @default process.cwd()
 * @param  {Boolean} [options.create] - TRUE will create new file if not existed. @default false
 */
export const saveAppConfig = (appConfig: AppConfig, options: SaveOpts = { directory: process.cwd(), create: false }) => {
	const { directory, create } = options;
	const filePath = path.resolve(directory || process.cwd(), "dx.json");

	if (!create && !fs.existsSync(filePath)) logError(`Không tìm thấy "dx.json"`);

	if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

	const content = JSON.stringify(appConfig, null, 2);
	fs.writeFileSync(filePath, content, "utf8");

	return getAppConfig(directory);
};

/**
 * Update values of app config ("dx.json")
 * @param updatedData - updated data
 */
export const updateAppConfig = (updatedData: AppConfig, options: SaveOpts = {}) => {
	const { directory = process.cwd() } = options;
	const currentAppConfig = getAppConfig(directory);

	const updatedDataMap = flattenObjectPaths(updatedData);
	Object.entries(updatedDataMap).map(([keyPath, value]) => {
		_.set(currentAppConfig, keyPath, value);
	});

	saveAppConfig(currentAppConfig, { directory });

	return currentAppConfig;
};

/**
 * Get object of project configuration from "package.json"
 * @param  {Object} [options] - Options
 * @param  {String} [options.directory] - Absolute path to project directory
 * @param  {Boolean} [options.ignoreIfNotExisted] - TRUE ignore the error if not existed.
 * @return {Object}
 */
export const getPackageConfig = (options: SaveOpts) => {
	const { directory, ignoreIfNotExisted = true } = options;
	let shouldReturn = true;
	const filePath = path.resolve(directory || process.cwd(), "package.json");

	if (!fs.existsSync(filePath)) {
		if (ignoreIfNotExisted) {
			shouldReturn = false;
		} else {
			logError(`Không tìm thấy "package.json"`);
		}
	}

	return shouldReturn ? readJson(filePath) : {};
};

/**
 * Save object of project configuration to "package.json"
 * @param  {Object} _config - Object data of the config
 * @param  {SaveOpts} [options] - Options
 * @param  {String} [options.directory] - Absolute path to project directory
 * @param  {Boolean} [options.create] - TRUE will create new file if not existed.
 * @param  {Boolean} [options.ignoreIfNotExisted] - TRUE ignore the error if not existed.
 */
export const savePackageConfig = (_config, options: SaveOpts) => {
	const { directory, ignoreIfNotExisted } = options;

	let shouldWriteFile = true;
	const filePath = path.resolve(directory || process.cwd(), "package.json");

	if (!options.create && !fs.existsSync(filePath) && !ignoreIfNotExisted) {
		logError(`Không tìm thấy "package.json"`);
		shouldWriteFile = false;
	}

	if (shouldWriteFile) {
		const content = JSON.stringify(_config, null, 2);
		return fs.writeFileSync(filePath, content, "utf8");
	}
};

export const parseGitRepoDataFromRepoSSH = (repoSSH: string) => {
	// git@bitbucket.org:<namespace>/<git-repo-slug>.git
	let namespace: string, fullSlug: string, repoSlug: string, gitDomain: string, gitProvider: GitProviderType;

	try {
		namespace = repoSSH.split(":")[1].split("/")[0];
	} catch (e) {
		logError(`Repository SSH (${repoSSH}) is invalid`);
		return;
	}

	try {
		repoSlug = repoSSH.split(":")[1].split("/")[1].split(".")[0];
	} catch (e) {
		logError(`Repository SSH (${repoSSH}) is invalid`);
		return;
	}

	try {
		gitDomain = repoSSH.split(":")[0].split("@")[1];
	} catch (e) {
		logError(`Repository SSH (${repoSSH}) is invalid`);
		return;
	}

	try {
		gitProvider = gitDomain.split(".")[0] as GitProviderType;
	} catch (e) {
		logError(`Repository SSH (${repoSSH}) is invalid`);
		return;
	}

	fullSlug = `${namespace}/${repoSlug}`;

	return { namespace, repoSlug, fullSlug, gitDomain, gitProvider };
};

interface PullOrCloneGitRepoOptions {
	onUpdate?: (msg: string, progress?: number) => void;
}

export const pullOrCloneGitRepo = async (repoSSH: string, dir: string, branch: string, options: PullOrCloneGitRepoOptions = {}) => {
	let git: SimpleGit;

	const { onUpdate } = options;

	const onProgress = ({ method, stage, progress }: SimpleGitProgressEvent) => {
		const message = `git.${method} ${stage} stage ${progress}% complete`;
		if (onUpdate) onUpdate(message, progress);
	};

	if (fs.existsSync(dir)) {
		try {
			git = simpleGit(dir, { progress: onProgress });
			const remotes = ((await git.getRemotes(false)) || []).filter((remote) => remote.name === "origin");
			const originRemote = remotes[0] as any;
			if (!originRemote) throw new Error(`This directory doesn't have any git remotes.`);
			console.log("originRemote :>> ", originRemote, `>`, { repoSSH });
			if (originRemote?.refs?.fetch !== repoSSH) await git.addRemote("origin", repoSSH);

			const curBranch = await getCurrentGitBranch(dir);
			await git.pull("origin", curBranch, ["--no-ff"]);
		} catch (e) {
			if (onUpdate) onUpdate(`Failed to pull "${repoSSH}" in "${dir}" directory (${e.message}) -> trying to clone new...`);

			// just for sure...
			await deleteFolderRecursive(dir);

			// for CLI create new app from a framework
			git = simpleGit({ progress: onProgress });

			try {
				await git.clone(repoSSH, dir, [`--branch=${branch}`, "--single-branch"]);
			} catch (e2) {
				if (onUpdate) onUpdate(`Failed to clone "${repoSSH}" (${branch}) to "${dir}" directory: ${e.message}`);
			}
		}
	} else {
		if (onUpdate) onUpdate(`Cache source code not found. Cloning "${repoSSH}" (${branch}) to "${dir}" directory.`);

		git = simpleGit({ progress: onProgress });

		try {
			await git.clone(repoSSH, dir, [`--branch=${branch}`, "--single-branch"]);
		} catch (e) {
			if (onUpdate) onUpdate(`Failed to clone "${repoSSH}" (${branch}) to "${dir}" directory: ${e.message}`);
		}
	}
};

/**
 * Get current remote SSH & URL
 */
export const getCurrentGitRepoData = async (dir = process.cwd()) => {
	try {
		const git = simpleGit(dir, {
			baseDir: `${dir}`,
			binary: "git",
		});
		// const remoteInfo = await git.listRemote();
		// console.log("remoteInfo :>> ", remoteInfo);
		const remotes = await git.getRemotes(true);
		// console.log("getCurrentGitRepoData > remotes :>> ", remotes);
		const remoteSSH = (remotes[0] as any)?.refs?.fetch;
		if (!remoteSSH) return;

		if (remoteSSH.indexOf("https://") > -1) {
			logError(`Git repository using HTTPS origin is not supported, please use SSH origin.`);
			log(`For example: "git remote set-url origin git@bitbucket.org:<namespace>/<git-repo-slug>.git"`);
			return;
		}

		const branch = await getCurrentGitBranch(dir);
		if (!branch) return;

		const { repoSlug: slug, gitProvider: provider, namespace, gitDomain, fullSlug } = parseGitRepoDataFromRepoSSH(remoteSSH);

		const remoteURL = generateRepoURL(provider, fullSlug);

		return { remoteSSH, remoteURL, provider, slug, fullSlug, namespace, gitDomain, branch };
	} catch (e) {
		// logWarn(`getCurrentGitRepoData() :>>`, e.toString());
		return;
	}
};

export const getGitProviderFromRepoSSH = (repoSSH: string): GitProviderType => {
	if (repoSSH.indexOf("bitbucket") > -1) return "bitbucket";
	if (repoSSH.indexOf("github") > -1) return "github";
	// if (repoSSH.indexOf("gitlab") > -1) return "gitlab";
	return;
};

export const isUsingExpressjsFramework = (options) => {
	let val = false;
	const { error, appDirectory } = checkMonorepo(options);
	if (error) return val;

	// framework name
	const frameworkConfigPath = path.resolve(appDirectory || process.cwd(), "package.json");
	// TODO: check if using express js

	// if (fs.existsSync(frameworkConfigPath)) {
	// 	const frameworkConfig = require(frameworkConfigPath);
	// 	val = frameworkConfig.repository && frameworkConfig.repository.indexOf(config.framework.expressjs) > -1;
	// }

	return val;
};

export const isUsingNodejsFramework = (options) => {
	let val = false;
	const { error, appDirectory } = checkMonorepo(options);
	if (error) return val;

	// framework name
	const frameworkConfigPath = path.resolve(appDirectory || process.cwd(), "package.json");

	// TODO: check if using node js
	// if (fs.existsSync(frameworkConfigPath)) {
	// 	const frameworkConfig = require(frameworkConfigPath);
	// 	val = frameworkConfig.repository && frameworkConfig.repository.indexOf(config.framework.nodejs) > -1;
	// }

	return val;
};

export const isUsingDiginextFramework = (options) => {
	let val = false;
	const { error, appDirectory } = checkMonorepo(options);
	if (error) return val;

	// framework name
	const frameworkConfigPath = path.resolve(appDirectory || process.cwd(), "package.json");

	if (fs.existsSync(frameworkConfigPath)) {
		const frameworkConfig = require(frameworkConfigPath);
		val = frameworkConfig.dependencies && frameworkConfig.dependencies.hasOwnProperty("next");
	}

	return val;
};

export const isUsingDiginestAPIFramework = (options) => {
	let val = false;
	const { error, appDirectory } = checkMonorepo(options);
	if (error) return val;

	// framework name
	const frameworkConfigPath = path.resolve(appDirectory || process.cwd(), "package.json");

	if (fs.existsSync(frameworkConfigPath)) {
		const frameworkConfig = require(frameworkConfigPath);
		val = frameworkConfig.dependencies && frameworkConfig.dependencies.hasOwnProperty("@nestjs/core");
	}

	return val;
};

export const isUsingStaticHtmlFramework = (options) => {
	let val = false;
	const { error, appDirectory } = checkMonorepo(options);
	if (error) return val;

	const frameworkConfigPath = path.resolve(appDirectory || process.cwd(), "dx.json");

	if (fs.existsSync(frameworkConfigPath)) {
		const frameworkConfig = require(frameworkConfigPath);
		val = typeof frameworkConfig.framework != "undefined" && frameworkConfig.framework == "static";
	}

	return val;
};

/**
 * Get current using framework of the project.
 * @return {("unknown"|"diginest"|"diginext"|"nodejs"|"expressjs"|"static")}
 */
export const getCurrentFramework = (options) => {
	let val = "unknown";
	if (isUsingDiginextFramework(options)) val = "diginext";
	if (isUsingDiginestAPIFramework(options)) val = "diginest";
	if (isUsingNodejsFramework(options)) val = "nodejs";
	if (isUsingExpressjsFramework(options)) val = "expressjs";
	if (isUsingStaticHtmlFramework(options)) val = "static";
	return val;
};

export const getImageFromYaml = (docs) => {
	let value = "";
	docs.map((doc) => {
		// log("doc", doc);
		if (doc && doc.kind == "Deployment") {
			value = doc.spec.template.spec.containers[0].image;
		}
	});
	return value;
};

export const getReplicasFromYaml = (docs) => {
	let value = 1;
	docs.map((doc) => {
		// log("doc", doc);
		if (doc && doc.kind == "Deployment") {
			value = doc.spec.replicas;
		}
	});
	return value;
};

/**
 * Completely remove the first / of the string
 * @param {String} input
 * @returns {String}
 */
export const trimFirstSlash = (input) => {
	// trim first slash of BASE_PATH:
	let output = input;
	for (let i = 0; i < 10; i++) {
		if (output.length > 0 && output.charAt(0) == "/") output = output.substr(1);
	}
	return output;
};

/**
 * Convert {Object} to environment variables of Kuberketes container
 * @param {Object} object - Input raw object, **not containing any methods**
 */
export const objectToKubeEnvVars = (object: any) => {
	return Object.entries(object).map(([name, value]) => {
		return { name, value } as KubeEnvironmentVariable;
	});
};

/**
 * Convert {Object} to .env content
 * @param {Object} object - Input raw object, **not containing any methods**
 * @returns {String}
 */
export const objectToDotenv = (object) => {
	let content = "";
	for (let key in object) {
		let val = object[key];
		content += key + "=" + `"${val}"` + "\n";
	}
	return content;
};

/**
 * Load ENV file (.env.*) and parse to array of K8S container environment variables
 */
export const loadEnvFileAsContainerEnvVars = (filePath: string) => {
	const envObject = dotenv.config({ path: filePath }).parsed;
	if (isEmpty(envObject)) return [];
	return objectToKubeEnvVars(envObject);
};

/**
 * Grab value of Kube ENV variables by name
 */
export const getValueOfKubeEnvVarsByName = (name: string, envVars: KubeEnvironmentVariable[]) => {
	return envVars.find((envVar) => envVar.name === name)?.value;
};

/**
 * Convert K8S container's ENV to .env content
 * @param {[{name,value}]} inputEnvs - Input raw object, **not containing any methods**
 * @returns {String}
 */
export const kubeEnvToDotenv = (inputEnvs: KubeEnvironmentVariable[]) => {
	let content = "";
	inputEnvs.map((envVar) => {
		content += envVar.name + "=" + `"${envVar.value}"` + "\n";
	});
	return content;
};

export const objectToDeploymentYaml = (deploymentCfg) => {
	let deploymentContent = "";

	if (!isArray(deploymentCfg)) deploymentCfg = [deploymentCfg];

	deploymentCfg.map((doc) => {
		if (doc) {
			deploymentContent += yaml.dump(doc);
			deploymentContent += "\n---\n";
		}
	});

	return deploymentContent;
};

export const strToArray = (str, splitter = ",") => {
	let arr = [];
	if (str.indexOf(splitter) > -1) {
		arr = [...str.split(splitter)];
	} else {
		arr = [str];
	}
	return arr;
};

export const getDiginextEnvVars = (env, projectSlug, domains) => {
	let environment = "staging";
	if (env == "prod") environment = "production";
	return {
		NEXT_PUBLIC_ENV: environment,
		NEXT_PUBLIC_CDN_BASE_PATH: `${DIGITOP_CDN_URL}/${projectSlug}/${env}`,
		NEXT_PUBLIC_BASE_PATH: typeof domains != "undefined" && domains.length ? "" : projectSlug,
		NEXT_PUBLIC_BASE_URL: typeof domains != "undefined" && domains.length ? `https://${domains[0]}` : ``,
		IRON_SESSION_SECRET: "NcvPDa2tlje1i6nvzZt6PmCHU5qcTcx4",
	};
};

export const objToEnv = (obj = {}) => {
	let content = "";
	for (const [key, val] of Object.entries(obj)) {
		let value = val;
		if (isString(val)) value = `"${val}"`;
		content += `${key}=${value}\n`;
	}
	return content;
};

export const sequentialExec = async (array, func) => {
	if (typeof func == "undefined") {
		logWarn("Input function not defined.");
		return;
	}
	return array.reduce(async (previous, item) => {
		await func(item);
		return item;
	}, Promise.resolve([]));
};

interface ResolveApplicationFilePathOptions {
	targetDirectory?: string;
	env?: string;
	ignoreIfNotExisted?: boolean;
}

/**
 * Resolve a location path of the file within the application.
 */
export const resolveFilePath = (fileNamePrefix: string, options: ResolveApplicationFilePathOptions) => {
	const { targetDirectory = process.cwd(), env = "dev", ignoreIfNotExisted = false } = options;

	let filePath = path.resolve(targetDirectory, `${fileNamePrefix}.${env}`);
	if (fs.existsSync(filePath)) return filePath;

	filePath = path.resolve(targetDirectory, `deployment/${fileNamePrefix}.${env}`);
	if (fs.existsSync(filePath)) return filePath;

	filePath = path.resolve(targetDirectory, fileNamePrefix);
	if (fs.existsSync(filePath)) return filePath;

	filePath = path.resolve(targetDirectory, `deployment/${fileNamePrefix}`);
	if (fs.existsSync(filePath)) return filePath;

	if (!ignoreIfNotExisted) {
		const message = `Missing "${targetDirectory}/${fileNamePrefix}" file, please create one.`;
		logError(message);
	}
	return;
};

/**
 * Resolve a location path of the "Dockerfile".
 */
export const resolveDockerfilePath = (options: ResolveApplicationFilePathOptions) => resolveFilePath("Dockerfile", options);

/**
 * Resolve a location path of the DOTENV (`.env.*`) file.
 */
export const resolveEnvFilePath = (options: ResolveApplicationFilePathOptions) => resolveFilePath(".env", options);

/**
 * Execute an command within a Docker container
 * @deprecated
 */
export const cliContainerExec = async (command, options) => {
	let getContainerName, cliContainerName;

	// restart the CLI container to update the environment:
	// if (!options.pipelineReady) {
	// 	await startPipeline([], options);
	// 	await wait(2000);
	// 	options.pipelineReady = true;
	// }

	if (isWin()) {
		getContainerName = await execa.command(`docker ps --format '{{.Names}}' | findstr diginext-cli`);
	} else {
		getContainerName = await execa.command(`docker ps --format '{{.Names}}' | grep diginext-cli`);
	}

	cliContainerName = getContainerName.stdout;
	log("[cliContainerExec] cliContainerName:", cliContainerName);

	if (cliContainerName) {
		if (options.isDebugging) {
			log(chalk.cyan("---------------- DIGINEXT-CLI DOCKER VERSION ------------------"));
			await execa("docker", ["exec", "-ti", cliContainerName, "docker", "-v"], { stdio: "inherit" });
			log(chalk.cyan("---------------- INSIDE DIGINEXT-CLI CONTAINER ----------------"));
			await execa("docker", ["exec", "-ti", cliContainerName, "ls"], { stdio: "inherit" });
			log(chalk.cyan("---------------------------------------"));
		}
		const args = command.split(" ");
		const { stdout } = await execa("docker", ["exec", "-ti", cliContainerName, ...args], {
			stdio: "inherit",
		});
		return stdout;
	} else {
		return false;
	}
};

async function logHelp(options?: InputOptions) {
	printHelp(options);
}

export const getIPFromDomain = async (domain) => {
	return new Promise((resolve, reject) => {
		dns.lookup(domain, (err, address, family) => {
			if (err) {
				logError(`${domain} chưa được trỏ về IP nào.`);
				reject(err);
			}
			resolve(address);
		});
	});
};

export const getClusterIP = async (options) => {
	let svcName = "nginx-ingress-controller",
		namespace = "nginx-ingress";

	let ingress, stdout;

	try {
		stdout = await cliContainerExec(`kubectl get svc/${svcName} -n ${namespace} -o json`, options);
		ingress = stdout ? JSON.parse(stdout) : null;
	} catch (e) {
		svcName = "ingress-nginx-controller";
		namespace = "ingress-nginx";

		stdout = await cliContainerExec(`kubectl get svc/${svcName} -n ${namespace} -o json`, options);
		ingress = stdout ? JSON.parse(stdout) : null;
	}

	return ingress ? ingress.status.loadBalancer.ingress[0].ip : null;
};

export const getIngress = async (ingName: string, namespace = "default", options = {}) => {
	let stdout = await cliContainerExec(`kubectl get ing/${ingName} -n ${namespace} -o json`, options);
	const ingress = stdout ? JSON.parse(stdout) : null;
	return ingress;
};

export const getIngressEndpoint = async (ingName: string, namespace = "default", options = {}) => {
	let ingress = await getIngress(ingName, namespace, options);
	return ingress.spec.rules[0].host;
};

export const getIngressIP = async (ingName: string, namespace = "default", index = 0, options = {}) => {
	let stdout = await cliContainerExec(`kubectl get ing/${ingName} -n ${namespace} -o json`, options);
	const ingress = stdout ? JSON.parse(stdout) : null;
	return ingress ? ingress.status.loadBalancer.ingress[index].ip : null;
};

export const getCurrentDeployment = async (deployName: string, namespace = "default", options = {}) => {
	let stdout = await cliContainerExec(`kubectl get deploy/${deployName} -n ${namespace} -o json`, options);
	if (typeof stdout == "string") {
		try {
			return JSON.parse(stdout);
		} catch (e) {
			return null;
		}
	} else {
		return null;
	}
};

export const getCurrentImageName = async (deployName: string, namespace = "default", options = {}) => {
	const deployObj = await getCurrentDeployment(deployName, namespace, options);
	return deployObj.spec.template.spec.containers[0].image || "";
};

export const getCurrentContainerEnvs = async (deployName: string, namespace = "default", options = {}) => {
	const deployObj = await getCurrentDeployment(deployName, namespace, options);
	return deployObj.spec.template.spec.containers[0].env || {};
};

export { logBitbucket, logBitbucketError, logHelp, toBase64, wait };

export const extractWorkspaceSlugFromUrl = (url: string) => {
	try {
		return url.split("//")[1].split(".")[0];
	} catch (e: any) {
		return;
	}
};

export const extractWorkspaceIdFromUser = (user: IUser) => {
	const workspaceId = (user.activeWorkspace as IWorkspace)._id
		? MongoDB.toString((user.activeWorkspace as IWorkspace)._id)
		: MongoDB.toString(user.activeWorkspace);

	return workspaceId;
};

export function getUnexpiredAccessToken(access_token: string) {
	let expiredDate = dayjs("2999-12-31");
	let expiredTimestamp = expiredDate.diff(dayjs());

	// assign "access_token" info to request:
	const token: AccessTokenInfo = {
		access_token,
		expiredTimestamp: expiredTimestamp,
		expiredDate: expiredDate.toDate(),
		expiredDateGTM7: expiredDate.format("YYYY-MM-DD HH:mm:ss"),
	};

	return token;
}

export const generateWorkspaceApiAccessToken = () => {
	const name = randomUUID();
	return { name, value: `${name}-${randomUUID()}` };
};
