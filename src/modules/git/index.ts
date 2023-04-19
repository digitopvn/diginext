import chalk from "chalk";
import { log, logError, logSuccess } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import execa from "execa";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import globby from "globby";
import { isEmpty } from "lodash";
import capitalize from "lodash/capitalize";
import open from "open";
import path from "path";
import { simpleGit } from "simple-git";
import yargs from "yargs";

import { cliOpts } from "@/config/config";
import { HOME_DIR } from "@/config/const";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { gitProviderDomain } from "@/interfaces/SystemTypes";
import { execCmd, getCurrentGitRepoData, isMac, wait } from "@/plugins";

import { conf } from "../..";
import { bitbucketProfile, repoList, signInBitbucket } from "../bitbucket";
import { createPullRequest } from "../bitbucket/createPullRequest";
import { createBitbucketRepo } from "../bitbucket/initialize";
import { applyBranchPermissions } from "../bitbucket/permissions";
import { bitbucketAuthentication } from "../bitbucket/promptForAuthOptions";
import Github from "./github";

// git@github.com:digitopvn/fluffy-dollop.git

// TODO: Implement CRUD of git provider

/**
 * Generate SSH URL of the git repository
 * @param provider
 * @example `github`
 * @param repoSlug - Include username/org slug, exclude ".git" at the end
 * @example `digitopvn/diginext13`
 * @returns
 */
export function generateRepoSSH(provider: GitProviderType | string, repoSlug: string) {
	return `git@${gitProviderDomain[provider]}:${repoSlug}.git`;
}

/**
 * Generate SSH URL of the git repository
 * @param repoSlug - Include username/org slug, exclude ".git" at the end
 * @example `digitopvn/diginext13`
 * @returns
 */
export function generateRepoURL(provider: GitProviderType | string, repoSlug: string) {
	return `https://${gitProviderDomain[provider]}/${repoSlug}`;
}

/**
 * Generate SSH URL of the git repository
 * @param repoSlug - Include username/org slug, exclude ".git" at the end
 * @example `digitopvn/diginext13`
 * @returns
 */
export const getRepoURLFromRepoSSH = generateRepoURL;

export const login = async (options?: InputOptions) => {
	const { gitProvider } = options;

	switch (gitProvider) {
		case "bitbucket":
			if (options.thirdAction && options.fourAction) {
				options.username = options.thirdAction;
				options.token = options.fourAction;
			} else {
				options = await bitbucketAuthentication(options);
			}

			const loginRes = await signInBitbucket(options);

			if (loginRes) {
				logSuccess(`Đăng nhập Bitbucket thành công.`);
				return true;
			} else {
				logError(`Đăng nhập Bitbucket that bai.`);
				return false;
			}

		case "github":
			await Github.login();
			break;

		default:
			log(`Git provider must be specified. Example: ${chalk.cyan(`dx git login `)}${chalk.yellow("--github")}`);
			break;
	}
};

export const logout = async () => {
	// logout bitbucket account
	conf.delete("username");
	conf.delete("token");

	// logout github account
	await Github.logout();

	logSuccess(`Logged out from all git providers.`);
};

/**
 * Create new repository on the git provider (bitbucket, github or gitlab)
 */
export async function initializeGitRemote(options: InputOptions) {
	// Create new remote repository
	options.repoSlug = `${options.projectSlug}-${makeSlug(options.name)}`.toLowerCase();

	// log(`options.git >>`, options.git);
	// log("options.gitProvider :>> ", options.gitProvider);
	// log("options.repoSlug :>> ", options.repoSlug);
	// log(`options.remoteURL >>`, options.remoteURL);
	log(`options.remoteSSH >>`, options.remoteSSH);
	// log(`options.repoURL >>`, options.repoURL);

	if (options.shouldUseGit && options.gitProvider == "bitbucket") await createBitbucketRepo(options);
	// TODO: Create new repo on "github"
	// TODO: Create new repo on "gitlab"

	log(`Created new repository on ${options.gitProvider}`);

	if (options.shouldUseGit) {
		// add git origin:
		const git = simpleGit(options.targetDirectory, { binary: "git" });
		await git.addRemote("origin", options.remoteSSH);
		await git.push("origin", "main");

		return true;
	}

	return true;
}

/**
 * Get user profile object
 */
export const getUserProfile = async (options?: InputOptions) => {
	const { gitProvider } = options;

	switch (gitProvider) {
		case "bitbucket":
			options = await bitbucketAuthentication(options);
			await signInBitbucket(options);
			return bitbucketProfile();

		case "github":
			const githubProfile = await Github.profile();
			log(githubProfile);
			return githubProfile;

		default:
			log(`Git provider must be specified. Example: ${chalk.cyan(`dx git profile `)}${chalk.yellow("--github")}`);
			break;
	}
};

export const setupRepositoryPermissions = async (options?: InputOptions) => {
	await signInBitbucket(options);

	await applyBranchPermissions(options, "master", "pull-request-only", "push", []);
	await applyBranchPermissions(options, "staging", "pull-request-only", "push", []);
	await applyBranchPermissions(options, "staging", "pull-request-only", "require_approvals_to_merge");
	await applyBranchPermissions(options, "prod", "pull-request-only", "push", []);
	await applyBranchPermissions(options, "prod", "pull-request-only", "restrict_merges");

	logSuccess(`Đã áp dụng quyền hạn chế truy cập mặc định.`);
};

export const getListRepositories = async (options?: InputOptions) => {
	await bitbucketAuthentication(options);
	await signInBitbucket(options);

	return repoList(options);
};

export const createNewPullRequest = async (options?: InputOptions) => {
	// const { gitProvider } = options;
	const repoInfo = await getCurrentGitRepoData(options.targetDirectory);
	if (!repoInfo) return logError(`This current directory doesn't have any integrated git remote.`);

	const { provider: gitProvider } = repoInfo;

	switch (gitProvider) {
		case "bitbucket":
			await bitbucketAuthentication(options);
			await signInBitbucket(options);
			return createPullRequest(options);

		case "github":
			if (repoInfo.remoteURL) {
				let destBranch = options.thirdAction || "main";
				let fromBranch = options.fourAction || repoInfo.branch;
				open(`${repoInfo.remoteURL}/compare/${destBranch}...${fromBranch}`);
			}
			break;

		default:
			log(
				`Git provider must be specified. Example: \n	${chalk.cyan(`dx git pr`)} ${chalk.yellow("--github")} <to_branch> \n	${chalk.cyan(
					`dx git pr`
				)} ${chalk.yellow("--github")} <from_branch> <to_branch>`
			);
			break;
	}
};

export const writeCustomSSHKeys = async (params: { privateKey: string; publicKey: string }) => {
	const { privateKey, publicKey } = params;
	if (!privateKey) throw new Error(`[GIT] Write SSH keys > "privateKey" content is required.`);
	if (!publicKey) throw new Error(`[GIT] Write SSH keys > "publicKey" content is required.`);

	const SSH_DIR = path.resolve(HOME_DIR, ".ssh");
	const idRsaDir = SSH_DIR;

	const slug = makeDaySlug({ divider: "" });
	const privateIdRsaFile = path.resolve(idRsaDir, `id_rsa${slug}`);
	const publicIdRsaFile = path.resolve(idRsaDir, `id_rsa${slug}.pub`);

	// delete existing files
	if (existsSync(privateIdRsaFile)) unlinkSync(privateIdRsaFile);
	if (existsSync(publicIdRsaFile)) unlinkSync(publicIdRsaFile);

	// write content to files
	writeFileSync(privateIdRsaFile, privateKey, "utf8");
	writeFileSync(publicIdRsaFile, publicKey, "utf8");

	// Make sure the private key is assigned correct permissions (400)
	try {
		await execa.command(`chmod -R 400 ${privateIdRsaFile}`);
	} catch (e) {
		throw new Error(`[GIT] Can't assign permission [400] to "id_rsa" private key.`);
	}

	log(`Added new SSH keys on this machine:`);
	log(`- Public key:`, publicIdRsaFile);
	log(`- Private key:`, privateIdRsaFile);

	return { privateIdRsaFile, publicIdRsaFile };
};

export const generateSSH = async (options?: InputOptions) => {
	// const { gitProvider } = options;
	// Check if any "id_rsa" existed

	const SSH_DIR = path.resolve(HOME_DIR, ".ssh");
	const idRsaDir = SSH_DIR;

	// const idRsaDir = path.resolve(CLI_DIR, "storage/home/ssh");
	// log(`idRsaDir:`, idRsaDir, `>> Existed: ${existsSync(idRsaDir)}`);

	let publicIdRsaFile: string, privateIdRsaFile: string;
	if (existsSync(idRsaDir)) {
		const files = await globby(idRsaDir + "/id_*");
		// log(`existed "id_rsa" files >>`, files);

		if (files.length > 0) {
			publicIdRsaFile = files.find((f) => f.indexOf(".pub") > -1);
			privateIdRsaFile = files.find((f) => f.indexOf(".pub") == -1);

			// Make sure the private key is assigned correct permissions (400)
			await execCmd(`chmod -R 400 ${privateIdRsaFile}`, `Can't assign permission [400] to "id_rsa" private key.`);
		}
	} else {
		await execCmd(`mkdir -p ${idRsaDir}`, `Can't create '${idRsaDir}' directory`);
	}

	// If no "id_rsa" existed -> generate one: ssh-keygen -b 2048 -t rsa -p -f $HOME/.ssh -q -N "" -> id_rsa  id_rsa.pub
	if (!publicIdRsaFile) {
		privateIdRsaFile = path.resolve(idRsaDir, "id_rsa");
		publicIdRsaFile = path.resolve(idRsaDir, "id_rsa.pub");

		try {
			await execa("ssh-keygen", ["-b", "2048", "-t", "rsa", "-f", privateIdRsaFile, "-q", "-N", "''"], cliOpts);
		} catch (e) {
			logError(`Can't generate SSH private & public key:`, e);
			throw new Error(`Can't generate SSH private & public key: ${e}`);
		}
		await wait(500);
	}

	log(`SSH keys on this machine:`);
	log(`- Public key:`, publicIdRsaFile);
	log(`- Private key:`, privateIdRsaFile);

	// set permission 400 to id_rsa files
	await execCmd(`chmod -R 400 ${privateIdRsaFile}`, `Can't set permission 400 to ${privateIdRsaFile}.`);

	// Start SSH agent & add private keys: eval `ssh-agent`
	await execCmd(`eval $(ssh-agent -s) && ssh-add ${privateIdRsaFile}`);

	// Return PUBLIC key to add to GIT provider
	const publicKeyContent = readFileSync(publicIdRsaFile, "utf8");
	logSuccess(`Copy this public key content & paste to GIT provider:`);
	log(publicKeyContent);

	return publicKeyContent;
};

export const sshKeysExisted = async () => {
	const SSH_DIR = path.resolve(HOME_DIR, ".ssh");
	const idRsaDir = SSH_DIR;

	let publicIdRsaFile: string, privateIdRsaFile: string;
	if (existsSync(idRsaDir)) {
		const files = await globby(idRsaDir + "/id_*");
		// log(`existed "id_rsa" files >>`, files);
		if (files.length > 0) {
			publicIdRsaFile = files.find((f) => f.indexOf(".pub") > -1);
			privateIdRsaFile = files.find((f) => f.indexOf(".pub") == -1);

			// Make sure the private key is assigned correct permissions (400)
			try {
				await execa.command(`chmod -R 400 ${privateIdRsaFile}`);
			} catch (e) {
				logError(`[GIT] Can't assign permission [400] to "id_rsa" private key.`);
				return false;
			}
		} else {
			return false;
		}
	} else {
		logError(`[GIT] PUBLIC_KEY and PRIVATE_KEY are not existed.`);
		return false;
	}

	return true;
};

export const getSshKeys = async () => {
	const SSH_DIR = path.resolve(HOME_DIR, ".ssh");
	const idRsaDir = SSH_DIR;

	const privateIdRsaFile = path.resolve(idRsaDir, "id_rsa");
	const publicIdRsaFile = path.resolve(idRsaDir, "id_rsa.pub");

	if (!existsSync(privateIdRsaFile)) throw new Error(`PRIVATE_KEY is not existed.`);
	if (!existsSync(publicIdRsaFile)) throw new Error(`PUBLIC_KEY is not existed.`);

	const privateKey = readFileSync(privateIdRsaFile, "utf8");
	const publicKey = readFileSync(publicIdRsaFile, "utf8");

	return { privateKey, publicKey };
};

export const getPublicKey = async () => {
	const SSH_DIR = path.resolve(HOME_DIR, ".ssh");
	const idRsaDir = SSH_DIR;

	const publicIdRsaFile = path.resolve(idRsaDir, "id_rsa.pub");

	if (!existsSync(publicIdRsaFile)) throw new Error(`PUBLIC_KEY is not existed.`);

	const publicKey = readFileSync(publicIdRsaFile, "utf8");

	return { publicKey };
};

export const verifySSH = async (options?: InputOptions) => {
	const { gitProvider } = options;

	const SSH_DIR = path.resolve(HOME_DIR, ".ssh");
	const idRsaDir = SSH_DIR;

	if (!existsSync(SSH_DIR)) await execCmd(`mkdir -p ${HOME_DIR}/.ssh`);

	let publicIdRsaFile: string, privateIdRsaFile: string;
	let privateIdRsaFiles: string[];

	if (existsSync(idRsaDir)) {
		const files = await globby(idRsaDir + "/id_*");
		// log(`existed "id_rsa" files >>`, files);
		privateIdRsaFiles = files.filter((f) => f.indexOf(".pub") === -1);

		if (files.length > 0) {
			publicIdRsaFile = files.find((f) => f.indexOf(".pub") > -1);
			privateIdRsaFile = files.find((f) => f.indexOf(".pub") == -1);

			// Make sure the private key is assigned correct permissions (400)
			await execCmd(`chmod -R 400 ${privateIdRsaFile}`, `Can't assign permission [400] to "id_rsa" private key.`);
		}
	} else {
		logError(`[GIT] PUBLIC_KEY and PRIVATE_KEY are not existed.`);
		return false;
	}

	// log(`[GIT] privateIdRsaFiles:`, privateIdRsaFiles);

	privateIdRsaFile = path.resolve(idRsaDir, "id_rsa");
	publicIdRsaFile = path.resolve(idRsaDir, "id_rsa.pub");

	const gitDomain = gitProviderDomain[gitProvider];

	const KNOWN_HOSTS_PATH = path.resolve(SSH_DIR, "known_hosts");
	if (!existsSync(KNOWN_HOSTS_PATH)) await execCmd(`touch ${HOME_DIR}/.ssh/known_hosts`);

	const KNOWN_HOSTS_CONTENT = readFileSync(KNOWN_HOSTS_PATH, "utf8");
	await execCmd(`ssh-keyscan ${gitDomain} >> ${HOME_DIR}/.ssh/known_hosts`);

	if (!isEmpty(privateIdRsaFiles)) {
		await execCmd(`touch ${HOME_DIR}/.ssh/config`);
		const sshConfigContent = (await execCmd(`cat ${HOME_DIR}/.ssh/config`)) || "";
		for (const idRsaFile of privateIdRsaFiles) {
			if (sshConfigContent.indexOf(idRsaFile) === -1 || sshConfigContent.indexOf(gitDomain) === -1) {
				await execCmd(`echo "Host ${gitDomain}" >> ${HOME_DIR}/.ssh/config`);
				if (isMac()) await execCmd(`echo "	UseKeychain yes" >> ${HOME_DIR}/.ssh/config`);
				await execCmd(`echo "	AddKeysToAgent yes" >> ${HOME_DIR}/.ssh/config`);
				await execCmd(`echo "	IdentityFile ${idRsaFile}" >> ${HOME_DIR}/.ssh/config`);
			}
		}
	}

	let authResult;
	switch (gitProvider) {
		case "bitbucket":
			authResult = await execCmd(`ssh -o StrictHostKeyChecking=no -T git@bitbucket.org`, "[GIT] Bitbucket authentication failed");
			authResult = typeof authResult !== "undefined";
			break;

		case "github":
			try {
				await execa.command(`ssh -o StrictHostKeyChecking=no -T git@github.com`);
				authResult = true;
			} catch (e) {
				authResult = e.toString().indexOf("successfully authenticated") > -1;
			}
			break;

		case "gitlab":
			authResult = await execCmd(`ssh -o StrictHostKeyChecking=no -T git@gitlab.com`, "[GIT] Gitlab authentication failed");
			authResult = typeof authResult !== "undefined";
			break;

		default:
			authResult = false;
			break;
	}

	if (authResult) {
		logSuccess(`[GIT] ✓ ${capitalize(gitProvider)} was authenticated successfully.`);
	} else {
		logError(`[GIT] ❌ Provider "${gitProvider}" is not valid.`);
	}

	return authResult;
};

/**
 * Check if the client machine can access to the git provider publicly.
 */
export const checkGitProviderAccess = async (gitProvider: GitProviderType) => {
	let result: any;
	switch (gitProvider) {
		case "bitbucket":
			result = await execCmd(`ssh -o StrictHostKeyChecking=no -T git@bitbucket.org`, "Bitbucket authentication failed");
			break;

		case "github":
			result = await execCmd(`ssh -o StrictHostKeyChecking=no -T git@github.com`, "Github authentication failed");
			break;

		case "gitlab":
			result = await execCmd(`ssh -o StrictHostKeyChecking=no -T git@gitlab.com`, "Gitlab authentication failed");
			break;

		default:
			logError(`Git provider "${gitProvider}" is not valid.`);
			result = false;
			break;
	}

	return result ? true : false;
};

/**
 * Check if the client machine can access to the PRIVATE git repository.
 */
export const checkGitRepoAccess = async (repoSSH: string) => {
	let result = await execCmd(`git ls-remote ${repoSSH}`, `You don't have access to this repo: ${repoSSH}`);

	return result ? true : false;
};

export async function execGit(options) {
	// if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	const { secondAction, thirdAction } = options;

	switch (secondAction) {
		case "ssh":
			switch (thirdAction) {
				case "generate":
				case "register":
				case "add":
					await generateSSH(options);
					return;

				case "verify":
					await verifySSH(options);
					return;

				default:
					yargs.command("git", "").showHelp();
					break;
			}

		case "apply-permissions":
		case "allow":
			await setupRepositoryPermissions(options);
			break;

		case "login":
			await login(options);
			break;

		case "logout":
			await logout();
			break;

		case "profile":
			await getUserProfile(options);
			break;

		case "pr":
		case "pullrequest":
			await createNewPullRequest(options);
			break;

		case "repo":
		case "repos":
			await getListRepositories(options);
			break;

		default:
			yargs.command("git", "").showHelp();
			break;
	}

	return options;
}
