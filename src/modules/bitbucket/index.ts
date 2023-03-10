import axios from "axios";
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

import { conf } from "@/index";
import type { InputOptions } from "@/interfaces/InputOptions";

// import { conf } from "../cli/update-cli";
import { deleteFolderRecursive, execCmd, logBitbucketError } from "../../plugins";

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

export const copyAllResources = async (destDirectory) => {
	let options = {
		overwrite: true,
		expand: true,
		dot: true,
		junk: true,
		// filter: ["**/*", "!.git"],
	};

	let success = false;
	try {
		await copy(".fw", destDirectory, options);
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
			symbol: "?????? ",
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
	const { directory = "./", message = "build(prepare for building) commit all files, push to origin" } = options;
	const git = simpleGit(directory, { binary: "git" });
	const gitStatus = await git.status(["-s"]);
	log("[current branch]", gitStatus.current);

	const currentBranch = gitStatus.current;
	const currentBranchKebab = _.kebabCase(currentBranch);
	const commitMessage = message;

	// commit & push everything, then try to merge "master" to current branch
	try {
		await git.add("./*");
		await git.commit(commitMessage);
		await git.push("origin", currentBranch);
	} catch (e) {
		logError(e);
	}

	return { currentBranch, currentBranchKebab };
}

export const pullingLatestFrameworkVersion = async (options: InputOptions) => {
	// const repoSSH = `git@bitbucket.org:${config.workspace}/${config.framework[framework]}.git`;
	const { frameworkVersion } = options;
	const { repoSSH } = options.framework;

	// create tmp dir
	const tmpDir = path.resolve(".fw/");
	try {
		await deleteFolderRecursive(tmpDir);
	} catch (e) {
		logError(e);
	}
	await mkdir(tmpDir);

	await execCmd(`git clone -b ${frameworkVersion} --single-branch ${repoSSH} ${tmpDir}`, "Failed to connect to the git provider.");

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
		// h???i tr?????c
		const questions = [];

		updateList.map((f, i) => {
			questions.push({
				type: "confirm",
				name: `answer-${i}`,
				message: `B???n c?? mu???n c???p nh???t "${f}" kh??ng?`,
				default: true,
			});
		});

		const confirms = await inquirer.prompt(questions);
		// log("confirms", confirms);

		// sau ???? m???i copy files:
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
	log(`??ang ti???n h??nh c??i ?????t "package.json" m???i...`);

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

/**
 * @param  {InputOptions} options
 */
export const signInBitbucket = async (options: InputOptions) => {
	auth.username = options.username;
	// auth.password = options.password;
	// auth.token = options.token;
	// auth.refreshToken = options.refreshToken;
	// console.log(`options.code:`, options.code);

	// obtain access token:
	const digested = Buffer.from(`s37Euc285LFVkMWfQh:thBkMjNRrLgJsPHvLCNXd3N5jJS6mTGJ`, "utf8").toString("base64");

	if (!options.token) {
		try {
			const bitbucketTokenRes = await axios({
				url: "https://bitbucket.org/site/oauth2/access_token",
				method: "POST",
				headers: {
					Authorization: `Basic ${digested}`,
					"Cache-Control": "no-cache",
					"Content-Type": "application/x-www-form-urlencoded",
				},
				data: new URLSearchParams({
					grant_type: "authorization_code",
					code: options.code,
				}),
			});
			// console.log(`Access token data:`, bitbucketTokenRes);
			const data = bitbucketTokenRes.data;
			options.token = data.access_token;
			options.refreshToken = data.refresh_token;

			conf.set("code", options.code);
			conf.set("token", options.token);
			conf.set("refreshToken", options.refreshToken);
		} catch (e) {
			log(`authenticateBitbucket > Error:`, e);
			log(`Access token error:`, e.response);
		}
	}

	bitbucket = new Bitbucket({
		baseUrl: "https://api.bitbucket.org/2.0",
		auth: { token: options.token },
	});

	// console.log(bitbucket);
	return new Promise(async (resolve, reject) => {
		bitbucket.user
			.get({ fields: "*" })
			.then(async ({ data, headers }) => {
				// log(data);
				// console.log(data, data.display_name, data.uuid, data.account_id);
				// set default git global username:
				// git config --global user.email "duynguyen@wearetopgroup.com"
				// git config --global user.name "BOSS Duy Nguyen"
				await execa("git", ["config", "--global", "user.email", auth.username]);
				await execa("git", ["config", "--global", "user.name", auth.username]);

				// profile
				workspaceId = data.uuid;
				auth.username = data.username;
				options.username = data.username;
				// logError(auth.username);

				// save credentials locally for future actions...
				conf.set("username", auth.username);
				// conf.set("password", auth.password);
				conf.set("token", options.token);
				conf.set("refreshToken", options.refreshToken);

				resolve(true);
			})
			.catch(async (e) => {
				// log(`[1] Access token might be expired >>`, e);
				// log(`>> Response:`, e.response);
				// log(`>> Error:`, e.error);

				if (e.error && e.error.error && e.error.error.message && e.error.error.message.indexOf("expired") > -1) {
					// token expired -> refresh token!
					try {
						const bitbucketTokenRes = await axios({
							url: "https://bitbucket.org/site/oauth2/access_token",
							method: "POST",
							headers: {
								Authorization: `Basic ${digested}`,
								"Cache-Control": "no-cache",
								"Content-Type": "application/x-www-form-urlencoded",
							},
							data: new URLSearchParams({
								grant_type: "refresh_token",
								refresh_token: options.refreshToken,
							}),
						});

						// console.log(`Refresh token data:`, bitbucketTokenRes);
						const data = bitbucketTokenRes.data;
						options.token = data.access_token;
						options.refreshToken = data.refresh_token;

						// conf.set("code", options.code);
						conf.set("token", options.token);
						conf.set("refreshToken", options.refreshToken);

						// log(`[3] Get new access token with refresh token > SUCCEED:`, options.token);

						// re-authenticate:
						const reauthenticate = await signInBitbucket(options);
						resolve(reauthenticate);
					} catch (_e) {
						// log(`[3] Get new access token with refresh token > ERROR:`, e.response);
						// log(`>> Error:`, e);
						resolve(false);
					}
				} else {
					// log(`[2] Get new access token error:`, e);
					// log(e.response);

					// conf.delete("username");
					conf.delete("code");
					conf.delete("token");
					conf.delete("refreshToken");

					logBitbucketError(e, 200, "authenticateBitbucket");

					resolve(false);
				}
			});
	});
};

export const bitbucketProfile = async () => {
	return new Promise((resolve, reject) => {
		bitbucket.user
			.get({ fields: "*" })
			.then(({ data, headers }) => {
				delete data.links;
				// console.log(data.display_name, data.uuid, data.account_id);
				log(data);
				resolve(data);
			})
			.catch((e) => {
				// console.log(e);
				reject();
				// conf.delete("password");
				conf.delete("username");
				conf.delete("code");
				conf.delete("token");
				conf.delete("refreshToken");
				logBitbucketError(e, 200, "authenticateBitbucket");
			});
	});
};

export const repoList = async (options: InputOptions) => {
	const { userId } = options;
	// TODO: get git provider
	return [];

	// try {
	// 	const { data, headers } = await bitbucket.repositories.list({
	// 		workspace: namespace,
	// 		sort: "-updated_on",
	// 	});
	// 	log("Recent active repositories:");
	// 	data.values.map((item, index) => {
	// 		console.info(`${index + 1}. ${item.full_name} (${dayjs(item.updated_on).format("YYYY-MM-DD HH:mm:ss")})`);
	// 	});
	// 	// console.info(data.values);
	// } catch (e) {
	// 	await logBitbucketError(e, 300, "authenticateBitbucket");
	// }
};

export const upgradeFramework = async (options) => {
	// 	logWarn(
	// 		chalk.bold("!!! CH?? ?? !!!"),
	// 		`Qu?? tr??nh n??ng c???p framework c?? th??? g??y l???i kh??ng t????ng th??ch, h??y ?????m b???o r???ng b???n ???? backup d??? ??n n??y ho???c ??ang l??m vi???c tr??n m???t nh??nh kh??c.`
	// 	);
	// 	const readyAnswer = await inquirer.prompt({
	// 		type: "confirm",
	// 		name: "value",
	// 		message: "B???n ???? s???n s??ng ch??a?",
	// 		default: false,
	// 	});
	// 	// log("isReady", readyAnswer.value);
	// 	if (!readyAnswer.value) {
	// 		process.exit(1);
	// 		return;
	// 	}
	// 	// Check dx.json & ????y c?? ph???i Diginext project hay kh??ng
	// 	const fwConfigExisted = fs.existsSync("dx.json");
	// 	if (!fwConfigExisted) {
	// 		logError("Th?? m???c d??? ??n n??y kh??ng ph???i ???????c t???o t??? Diginext CLI, kh??ng th??? n??ng c???p ???????c");
	// 		process.exit(1);
	// 	}
	// 	const latestVersion = await getLatestFrameworkVersion();
	// 	const framework = await getCurrentFramework(options);
	// 	// log("framework:", framework);
	// 	// ki???m tra t??nh t????ng th??ch c???a vi???c c???p nh???t t??? ?????ng:
	// 	const curPackage = require(path.resolve("package.json"));
	// 	const _vs = curPackage.version.split(".");
	// 	if (parseInt(_vs[0]) < 1 || (parseInt(_vs[0]) == 1 && parseInt(_vs[1]) < 2)) {
	// 		logError("R???t ti???c, n??ng c???p t??? ?????ng kh??ng ??p d???ng cho framework version <1.2.0 v?? c?? qu?? nhi???u thay ?????i ph?? v??? c???u tr??c d??? ??n.");
	// 		process.exit(1);
	// 	}
	// 	log(`Ti???n h??nh n??ng c???p framework "${framework}" t??? "${curPackage.version}" -> "${chalk.green(latestVersion.substring(1))}"...`);
	// 	// T???i framework m???i v??? th?? m???c t???m:
	// 	options.framework = framework;
	// 	options.frameworkVersion = latestVersion;
	// 	await pullingLatestFrameworkVersion(options);
	// 	// c???p nh???t dx.json
	// 	const fwConf = require(path.resolve("dx.json"));
	// 	fwConf.version = latestVersion;
	// 	fwConf["diginext-cli"] = pkg.version;
	// 	// log(fwConf);
	// 	// c???p nh???t package.json
	// 	const patchedPackage = patchPackage();
	// 	// c??i ?????t packages m???i v??o "node_modules"
	// 	// h???i v??? vi???c c???p nh???t t??i nguy??n m???i:
	// 	const upgradeAllStrategy = await inquirer.prompt({
	// 		type: "confirm",
	// 		name: "value",
	// 		message: `Nh???ng t??i nguy??n sau s??? ???????c c???p nh???t m???i:
	// - /components/admin/*
	// - /components/dashkit/*
	// - /components/diginext/*
	// - /plugins/*
	// - /optimizer/*
	// - /modules/*
	// - .babelrc
	// - .env.example
	// - jsconfig.json
	// - next.config.js
	// - polyfills.js
	// - postcss.config.js
	// - server.js
	// - server.dev.js
	// - web.config.js
	// B???n c?? mu???n c???p nh???t t???t c??? kh??ng? (NO = l???a ch???n c???p nh???t t???ng m???c)`,
	// 		default: true,
	// 	});
	// 	// c???p nh???t t??i nguy??n m???i (all or individually):
	// 	await patchResources(upgradeAllStrategy.value);
	// 	// write patched files (package.json & dx.json):
	// 	await writeConfigFiles(fwConf, patchedPackage);
	// 	// c??i ?????t c??c package m???i
	// 	await installPackages();
	// 	// clean up sau khi c???p nh???t xong:
	// 	await cleanUp();
	// 	// h?????ng d???n test l???i
	// 	logSuccess(
	// 		chalk.green("C???p nh???t ho??n t???t! H??y s??? d???ng c??c l???nh sau ????? ki???m tra l???i ???ng d???ng:"),
	// 		"\n   yarn build",
	// 		"\n   yarn dev",
	// 		chalk.green("\nCh??c b???n may m???n! =))")
	// 	);
};
