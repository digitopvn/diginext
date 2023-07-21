import chalk from "chalk";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import { execaCommandSync, execaSync } from "execa";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import globby from "globby";
import capitalize from "lodash/capitalize";
import open from "open";
import path from "path";
import { simpleGit } from "simple-git";
import yargs from "yargs";

import { HOME_DIR, SSH_DIR } from "@/config/const";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { GitProviderDomain, GitProviderType } from "@/interfaces/SystemTypes";
import { gitProviderDomain } from "@/interfaces/SystemTypes";
import { execCmd, getCurrentGitRepoData, isMac, wait } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

// import { conf } from "../..";
import Github from "./github";

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
			logWarn(`This feature is under development.`);
			return false;

		case "github":
			// logWarn(`This feature is under development.`);
			await Github.loginWithApp();
			break;

		default:
			log(`Git provider must be specified. Example: ${chalk.cyan(`dx git login `)}${chalk.yellow("--github")}`);
			break;
	}
};

export const logout = async () => {
	// logout bitbucket account
	// conf.delete("username");
	// conf.delete("token");

	// logout github account
	await Github.logout();

	logSuccess(`Logged out from all git providers.`);
};

export interface InitializeGitRemoteOptions extends Pick<InputOptions, "repoSSH" | "targetDirectory" | "username"> {
	/**
	 * App's working directory
	 */
	dir: string;
}

/**
 * @deprecated
 * Setup "main" branch and "dev/*" branch
 */
export async function initializeGitRemote(options: InitializeGitRemoteOptions) {
	const { dir = options.targetDirectory || process.cwd() } = options;

	// add git origin:
	const git = simpleGit(dir, { binary: "git" });
	await git.addRemote("origin", options.repoSSH);
	await git.push("origin", "main");

	// create developer branches
	const gitUsername = (await git.getConfig(`user.name`, "global")).value;
	const username = options.username || (gitUsername ? makeSlug(gitUsername).toLowerCase() : undefined) || "developer";
	const devBranch = `dev/${username}`;
	await git.checkout(["-b", devBranch]);
	await git.push("origin", devBranch);

	return true;
}

/**
 * Get user profile object
 */
export const getUserProfile = async (options?: InputOptions) => {
	const { gitProvider } = options;

	switch (gitProvider) {
		case "bitbucket":
			logWarn(`This feature is under development.`);
			return;

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
	logWarn(`This feature is under development.`);

	// await applyBranchPermissions(options, "master", "pull-request-only", "push", []);
	// await applyBranchPermissions(options, "staging", "pull-request-only", "push", []);
	// await applyBranchPermissions(options, "staging", "pull-request-only", "require_approvals_to_merge");
	// await applyBranchPermissions(options, "prod", "pull-request-only", "push", []);
	// await applyBranchPermissions(options, "prod", "pull-request-only", "restrict_merges");

	// logSuccess(`Đã áp dụng quyền hạn chế truy cập mặc định.`);
};

export const getListRepositories = async (options?: InputOptions) => {
	logWarn(`This feature is under development.`);
	// await bitbucketAuthentication(options);
	// await signInBitbucket(options);

	// return repoList(options);
};

export const createNewPullRequest = async (options?: InputOptions) => {
	// const { gitProvider } = options;
	const repoInfo = await getCurrentGitRepoData(options.targetDirectory);
	if (!repoInfo) return logError(`This current directory doesn't have any integrated git remote.`);

	const { provider: gitProvider } = repoInfo;

	switch (gitProvider) {
		case "bitbucket":
			logWarn(`This feature is under development.`);

		case "github":
			if (repoInfo.repoURL) {
				let destBranch = options.thirdAction || "main";
				let fromBranch = options.fourAction || repoInfo.branch;
				open(`${repoInfo.repoURL}/compare/${destBranch}...${fromBranch}`);
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

export const addKeysToKnownHosts = async (data: { gitDomain: string; publicIdRsaFile: string; privateIdRsaFile: string }) => {
	const { gitDomain, publicIdRsaFile, privateIdRsaFile } = data;
	if (!gitDomain) throw new Error(`Git provider's domain is required.`);
	if (!publicIdRsaFile) throw new Error(`Path to public id_rsa.pub file is required.`);
	if (!privateIdRsaFile) throw new Error(`Path to prrivate id_rsa file is required.`);

	// check if "known_hosts" file exists
	const knownHostsPath = path.resolve(SSH_DIR, "known_hosts");
	if (!existsSync(knownHostsPath)) await execCmd(`touch ${knownHostsPath}`);

	// only scan SSH key of git provider if it's not existed
	const publicKeyContent = readFileSync(publicIdRsaFile, "utf8");
	const knownHostsContent = readFileSync(knownHostsPath, "utf8");
	if (knownHostsContent.indexOf(publicKeyContent) === -1) await execCmd(`ssh-keyscan ${gitDomain} >> ${knownHostsPath}`);

	// SSH config
	const sshConfigPath = path.join(SSH_DIR, "config");
	await execCmd(`touch ${sshConfigPath}`);
	const sshConfigContent = (await execCmd(`cat ${sshConfigPath}`)) || "";

	if (sshConfigContent.indexOf(privateIdRsaFile) === -1 && sshConfigContent.indexOf(gitDomain) === -1) {
		await execCmd(`echo "Host ${gitDomain}" >> ${sshConfigPath}`);
		if (isMac()) await execCmd(`echo "	UseKeychain yes" >> ${sshConfigPath}`);
		await execCmd(`echo "	AddKeysToAgent yes" >> ${sshConfigPath}`);
		await execCmd(`echo "	IdentityFile ${privateIdRsaFile}" >> ${sshConfigPath}`);
	}

	return { gitDomain, publicIdRsaFile, privateIdRsaFile, sshConfigPath, knownHostsPath };
};

export const writeCustomSSHKeys = async (params: { gitDomain: GitProviderDomain; privateKey: string; publicKey?: string; force?: boolean }) => {
	const { gitDomain, privateKey, publicKey } = params;
	if (!gitDomain) throw new Error(`[GIT] Write SSH keys > "gitDomain" is required.`);
	if (!privateKey) throw new Error(`[GIT] Write SSH keys > Content of "privateKey" is required.`);
	// if (!publicKey) throw new Error(`[GIT] Write SSH keys > Content of "publicKey" is required.`);

	const idRsaDir = SSH_DIR;

	const slug = makeSlug(gitDomain, { delimiter: "_" });
	const privateIdRsaFile = path.resolve(idRsaDir, `id_rsa_${slug}`);
	const publicIdRsaFile = path.resolve(idRsaDir, `id_rsa_${slug}.pub`);

	// delete existing files
	if (existsSync(privateIdRsaFile)) unlinkSync(privateIdRsaFile);
	if (existsSync(publicIdRsaFile)) unlinkSync(publicIdRsaFile);

	// write "privateKey" content to file
	writeFileSync(privateIdRsaFile, privateKey, "utf8");

	// Make sure the private key is assigned correct permissions (400)
	try {
		const { execaCommand } = await import("execa");
		await execaCommand(`chmod -R 400 ${privateIdRsaFile}`);
	} catch (e) {
		throw new Error(`[GIT] Can't assign permission [400] to "id_rsa" private key.`);
	}

	// write "publicKey" to file event if "publicKey" is not provided
	const publicKeyContent = publicKey || execaCommandSync(`ssh-keygen -y -f ${privateIdRsaFile} > ${publicIdRsaFile}`).stdout;
	writeFileSync(publicIdRsaFile, publicKeyContent, "utf8");

	// add keys to "know_hosts"
	await addKeysToKnownHosts({ gitDomain, privateIdRsaFile, publicIdRsaFile });

	// print results
	log(`[GIT] Added new SSH keys on this machine:`);
	log(`  - Public key:`, publicIdRsaFile);
	log(`  - Private key:`, privateIdRsaFile);

	return { gitDomain, privateIdRsaFile, publicIdRsaFile };
};

export const generateSSH = async (options?: InputOptions) => {
	// const { gitProvider } = options;
	// Check if any "id_rsa" existed
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

	// If no "id_rsa" existed -> generate one: ssh-keygen -b 2048 -t rsa -p -f $HOME/.ssh/id_rsa -q -N "" -> id_rsa  id_rsa.pub
	if (!publicIdRsaFile) {
		privateIdRsaFile = path.resolve(idRsaDir, "id_rsa");
		publicIdRsaFile = path.resolve(idRsaDir, "id_rsa.pub");

		try {
			const { execa, execaCommand } = await import("execa");
			await execa("ssh-keygen", ["-b", "2048", "-t", "rsa", "-f", privateIdRsaFile, "-q", "-N", ""]);
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

export const sshKeysExisted = async (options?: { publicIdRsaFile: string; privateIdRsaFile: string }) => {
	let publicIdRsaFile: string = options?.publicIdRsaFile;
	let privateIdRsaFile: string = options?.privateIdRsaFile;

	if (!existsSync(SSH_DIR)) {
		logWarn(`[GIT] SSH directory is not existed.`);
		return false;
	}

	if (!publicIdRsaFile || !privateIdRsaFile) {
		const files = await globby(SSH_DIR + "/id_*");
		if (files.length > 0) {
			publicIdRsaFile = files.find((f) => f.indexOf(".pub") > -1);
			privateIdRsaFile = files.find((f) => f.indexOf(".pub") == -1);

			// Make sure the private key is assigned correct permissions (400)
			try {
				const { execa, execaCommand } = await import("execa");
				await execaCommand(`chmod -R 400 ${privateIdRsaFile}`);
			} catch (e) {
				logError(`[GIT] Can't assign permission [400] to "id_rsa" private key.`);
				return false;
			}
		} else {
			logWarn(`[GIT] PUBLIC_KEY and PRIVATE_KEY are not existed.`);
			return false;
		}
	} else {
		logWarn(`[GIT] PUBLIC_KEY and PRIVATE_KEY are not existed.`);
		return false;
	}

	return true;
};

export const getSshKeys = async (options?: { publicIdRsaFile: string; privateIdRsaFile: string }) => {
	const privateIdRsaFile = options?.privateIdRsaFile || path.resolve(SSH_DIR, "id_rsa");
	const publicIdRsaFile = options?.publicIdRsaFile || path.resolve(SSH_DIR, "id_rsa.pub");

	if (!existsSync(privateIdRsaFile)) throw new Error(`Private SSH key is not existed.`);
	if (!existsSync(publicIdRsaFile)) throw new Error(`Public SSH key is not existed.`);

	const privateKey = readFileSync(privateIdRsaFile, "utf8");
	const publicKey = readFileSync(publicIdRsaFile, "utf8");

	return { privateKey, publicKey };
};

export const getPublicKey = async (filePath?: string) => {
	const publicIdRsaFile = filePath || path.resolve(SSH_DIR, "id_rsa.pub");

	if (!existsSync(publicIdRsaFile)) throw new Error(`PUBLIC_KEY is not existed.`);

	const publicKey = readFileSync(publicIdRsaFile, "utf8");

	return { publicKey };
};

export const sshKeyContainPassphase = (options?: { sshFile: string }) => {
	const idRsaFile = options?.sshFile || path.resolve(HOME_DIR, ".ssh/id_rsa");
	try {
		execaSync("ssh-keygen", ["-y", "-f", idRsaFile]);
		return false;
	} catch (e) {
		return true;
	}
};

export const verifySSH = async (options?: InputOptions) => {
	const { gitProvider } = options;

	let authResult;
	switch (gitProvider) {
		case "bitbucket":
			authResult = await execCmd(`ssh -o StrictHostKeyChecking=no -T git@bitbucket.org`, "[GIT] Bitbucket authentication failed");
			authResult = typeof authResult !== "undefined";
			break;

		case "github":
			// has to use this because "Github does not provide shell access"
			try {
				const { execa, execaCommand } = await import("execa");
				await execaCommand(`ssh -o StrictHostKeyChecking=no -T git@github.com`);
				authResult = true;
			} catch (e) {
				authResult = e.toString().indexOf("successfully authenticated") > -1;
			}
			break;

		// case "gitlab":
		// 	authResult = await execCmd(`ssh -o StrictHostKeyChecking=no -T git@gitlab.com`, "[GIT] Gitlab authentication failed");
		// 	authResult = typeof authResult !== "undefined";
		// 	break;

		default:
			authResult = false;
			break;
	}

	if (authResult) {
		logSuccess(`[GIT] ✅ ${capitalize(gitProvider)} was authenticated successfully.`);
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
			// has to use this because "Github does not provide shell access"
			try {
				const { execa, execaCommand } = await import("execa");
				result = await execaCommand(`ssh -o StrictHostKeyChecking=no -T git@github.com`);
			} catch (e) {
				result = e.toString().indexOf("successfully authenticated") > -1 ? true : undefined;
			}
			break;

		// case "gitlab":
		// 	result = await execCmd(`ssh -o StrictHostKeyChecking=no -T git@gitlab.com`, "Gitlab authentication failed");
		// 	break;

		default:
			logError(`Git provider "${gitProvider}" is not valid.`);
			result = false;
			break;
	}

	return typeof result !== "undefined" ? true : false;
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
