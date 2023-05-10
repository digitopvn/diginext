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

import { isServerMode } from "@/app.config";
import { conf } from "@/index";
import type { InputOptions } from "@/interfaces/InputOptions";

// import { conf } from "../cli/update-cli";
import { deleteFolderRecursive, logBitbucketError, pullOrCloneGitRepo } from "../../plugins";

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
				spin.text = `Pulling "${name}" framework... ${progress}%`;
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
				// await execa("git", ["config", "--global", "user.email", auth.username]);
				// await execa("git", ["config", "--global", "user.name", auth.username]);

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

/**
 * @deprecated
 */
export const upgradeFramework = async (options) => {
	// 	logWarn(
	// 		chalk.bold("!!! CHÚ Ý !!!"),
	// 		`Quá trình nâng cấp framework có thể gây lỗi không tương thích, hãy đảm bảo rằng bạn đã backup dự án này hoặc đang làm việc trên một nhánh khác.`
	// 	);
	// 	const readyAnswer = await inquirer.prompt({
	// 		type: "confirm",
	// 		name: "value",
	// 		message: "Bạn đã sẵn sàng chưa?",
	// 		default: false,
	// 	});
	// 	// log("isReady", readyAnswer.value);
	// 	if (!readyAnswer.value) {
	// 		process.exit(1);
	// 		return;
	// 	}
	// 	// Check dx.json & đây có phải Diginext project hay không
	// 	const fwConfigExisted = fs.existsSync("dx.json");
	// 	if (!fwConfigExisted) {
	// 		logError("Thư mục dự án này không phải được tạo từ Diginext CLI, không thể nâng cấp được");
	// 		process.exit(1);
	// 	}
	// 	const latestVersion = await getLatestFrameworkVersion();
	// 	const framework = await getCurrentFramework(options);
	// 	// log("framework:", framework);
	// 	// kiểm tra tính tương thích của việc cập nhật tự động:
	// 	const curPackage = require(path.resolve("package.json"));
	// 	const _vs = curPackage.version.split(".");
	// 	if (parseInt(_vs[0]) < 1 || (parseInt(_vs[0]) == 1 && parseInt(_vs[1]) < 2)) {
	// 		logError("Rất tiếc, nâng cấp tự động không áp dụng cho framework version <1.2.0 vì có quá nhiều thay đổi phá vỡ cấu trúc dự án.");
	// 		process.exit(1);
	// 	}
	// 	log(`Tiến hành nâng cấp framework "${framework}" từ "${curPackage.version}" -> "${chalk.green(latestVersion.substring(1))}"...`);
	// 	// Tải framework mới về thư mục tạm:
	// 	options.framework = framework;
	// 	options.frameworkVersion = latestVersion;
	// 	await pullingLatestFrameworkVersion(options);
	// 	// cập nhật dx.json
	// 	const fwConf = require(path.resolve("dx.json"));
	// 	fwConf.version = latestVersion;
	// 	fwConf["diginext-cli"] = pkg.version;
	// 	// log(fwConf);
	// 	// cập nhật package.json
	// 	const patchedPackage = patchPackage();
	// 	// cài đặt packages mới vào "node_modules"
	// 	// hỏi về việc cập nhật tài nguyên mới:
	// 	const upgradeAllStrategy = await inquirer.prompt({
	// 		type: "confirm",
	// 		name: "value",
	// 		message: `Những tài nguyên sau sẽ được cập nhật mới:
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
	// Bạn có muốn cập nhật tất cả không? (NO = lựa chọn cập nhật từng mục)`,
	// 		default: true,
	// 	});
	// 	// cập nhật tài nguyên mới (all or individually):
	// 	await patchResources(upgradeAllStrategy.value);
	// 	// write patched files (package.json & dx.json):
	// 	await writeConfigFiles(fwConf, patchedPackage);
	// 	// cài đặt các package mới
	// 	await installPackages();
	// 	// clean up sau khi cập nhật xong:
	// 	await cleanUp();
	// 	// hướng dẫn test lại
	// 	logSuccess(
	// 		chalk.green("Cập nhật hoàn tất! Hãy sử dụng các lệnh sau để kiểm tra lại ứng dụng:"),
	// 		"\n   yarn build",
	// 		"\n   yarn dev",
	// 		chalk.green("\nChúc bạn may mắn! =))")
	// 	);
};
