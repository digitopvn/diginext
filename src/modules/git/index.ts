import { log, logError, logSuccess } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import execa from "execa";
import { existsSync, readFileSync } from "fs";
import globby from "globby";
import capitalize from "lodash/capitalize";
import path from "path";
import { simpleGit } from "simple-git";
import yargs from "yargs";

import { cliOpts } from "@/config/config";
import { CLI_DIR } from "@/config/const";
import type { InputOptions } from "@/interfaces/InputOptions";
import { execCmd, isMac, wait } from "@/plugins";

import { conf } from "../..";
import { bitbucketProfile, repoList, signInBitbucket } from "../bitbucket";
import { createPullRequest } from "../bitbucket/createPullRequest";
import { createBitbucketRepo } from "../bitbucket/initialize";
import { applyBranchPermissions } from "../bitbucket/permissions";
import { bitbucketAuthentication } from "../bitbucket/promptForAuthOptions";

// git@github.com:digitopvn/fluffy-dollop.git

export const availableGitProviders = ["bitbucket", "github", "gitlab"];

export const gitProviderDomain = {
	bitbucket: "bitbucket.org",
	github: "github.com",
	gitlab: "gitlab.com",
};

// TODO: Implement CRUD of git provider

/**
 * Generate SSH URL of the git repository
 * @param provider
 * @example `github`
 * @param repoSlug - Include username/org slug, exclude ".git" at the end
 * @example `digitopvn/diginext13`
 * @returns
 */
export function getRepoSSH(provider: "bitbucket" | "github" | "gitlab" | string, repoSlug: string) {
	return `git@${gitProviderDomain[provider]}:${repoSlug}.git`;
}

/**
 * Generate SSH URL of the git repository
 * @param provider
 * @example `github`
 * @param repoSlug - Include username/org slug, exclude ".git" at the end
 * @example `digitopvn/diginext13`
 * @returns
 */
export function getRepoURL(provider: "bitbucket" | "github" | "gitlab" | string, repoSlug: string) {
	return `https://${gitProviderDomain[provider]}/${repoSlug}`;
}

export const login = async (options?: InputOptions) => {
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
};

export const logout = () => {
	conf.delete("username");
	conf.delete("token");

	logSuccess(`Đăng xuất Bitbucket thành công.`);
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
	// log(`options.remoteSSH >>`, options.remoteSSH);
	// log(`options.repoURL >>`, options.repoURL);

	if (options.git && options.gitProvider == "bitbucket") await createBitbucketRepo(options);
	// TODO: Create new repo on "github"
	// TODO: Create new repo on "gitlab"

	log(`Created new repository on ${options.gitProvider}`);

	if (options.git) {
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
	options = await bitbucketAuthentication(options);
	await signInBitbucket(options);

	return bitbucketProfile();
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
	await bitbucketAuthentication(options);
	await signInBitbucket(options);

	return createPullRequest(options);
};

export const generateSSH = async (options?: InputOptions) => {
	// const { gitProvider } = options;
	// Check if any "id_rsa" existed

	const idRsaDir = process.env.STORAGE ? path.resolve(process.env.STORAGE, "home/ssh") : path.resolve(CLI_DIR, "storage/home/ssh");

	// const idRsaDir = path.resolve(CLI_DIR, "storage/home/ssh");
	log(`idRsaDir:`, idRsaDir, `>> Existed: ${existsSync(idRsaDir)}`);

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
		// create "~/.ssh" directory
		// mkdirSync(idRsaDir, { recursive: true });
		await execCmd(`mkdir -p ${idRsaDir}`, `Can't create '${idRsaDir}' directory`);
	}

	// If no "id_rsa" existed -> generate one: ssh-keygen -b 2048 -t rsa -p -f ~/.ssh -q -N "" -> id_rsa  id_rsa.pub
	if (!publicIdRsaFile) {
		privateIdRsaFile = path.resolve(idRsaDir, "id_rsa");
		publicIdRsaFile = path.resolve(idRsaDir, "id_rsa.pub");
		// await execCmd(`ssh-keygen -b 2048 -t rsa -f ${privateIdRsaFile} -q -N \"\"`, );
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
	// await execCmd(`mkdir -p ~/.ssh`);
	// await execCmd(`touch ~/.ssh/known_hosts`);
	// await execCmd(`ssh-keyscan ${gitProviderDomain[gitProvider]} >> ~/.ssh/known_hosts`);
	// await execCmd(`touch ~/.ssh/config`);
	// if (isMac()) {
	// 	await execCmd(
	// 		`echo "Host ${gitProviderDomain[gitProvider]}\n	UseKeychain yes\n	AddKeysToAgent yes\n	IdentityFile ${privateIdRsaFile}" >> ~/.ssh/config`
	// 	);
	// } else {
	// 	await execCmd(`echo "Host ${gitProviderDomain[gitProvider]}\n	AddKeysToAgent yes\n	IdentityFile ${privateIdRsaFile}" >> ~/.ssh/config`);
	// }
	// await execCmd(`ssh -T git@${gitProviderDomain[gitProvider]}`);

	/**
	 * macOS only: So that your computer remembers your password each time it restarts,
	 * open (or create) the ~/.ssh/config file and add these lines to the file:
	 * @examples
	 * ```
	 * Host *
	 * UseKeychain yes
	 * ```
	 */
	// const sshConfigKeychainFile = path.resolve(HOME_DIR, ".ssh/config");
	// if (!existsSync(sshConfigKeychainFile)) {
	// 	const sshConfigKeychainContent = isMac()
	// 		? `Host *\n	UseKeychain yes`
	// 		: `Host *\n	AddKeysToAgent yes\n	UseKeychain yes\n	IdentityFile ${privateIdRsaFile}`;
	// 	writeFileSync(sshConfigKeychainFile, sshConfigKeychainContent, "utf8");
	// } else {
	// 	log(`SKIP >> SSH keychain was configurated already.`);
	// }

	// Add private key with: ssh-add -K ~/.ssh/id_rsa
	// await execCmd(`ssh-add ${privateIdRsaFile}`, `Can't add private key`);
	// await execCmd(`${CLI_DIR}/ssh_add ${privateIdRsaFile}`, `Can't add private key`);

	// Return PUBLIC key to add to GIT provider
	const publicKeyContent = readFileSync(publicIdRsaFile, "utf8");
	logSuccess(`Copy this public key content & paste to GIT provider:`);
	log(publicKeyContent);
	return publicKeyContent;
};

export const verifySSH = async (options?: InputOptions) => {
	const { gitProvider } = options;

	const idRsaDir = process.env.STORAGE ? path.resolve(process.env.STORAGE, "home/ssh") : path.resolve(CLI_DIR, "storage/home/ssh");

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
		logError(`PUBLIC_KEY and PRIVATE_KEY are not existed.`);
		return false;
	}

	privateIdRsaFile = path.resolve(idRsaDir, "id_rsa");
	publicIdRsaFile = path.resolve(idRsaDir, "id_rsa.pub");

	await execCmd(`mkdir -p ~/.ssh`);
	await execCmd(`touch ~/.ssh/known_hosts`);
	await execCmd(`ssh-keyscan ${gitProviderDomain[gitProvider]} >> ~/.ssh/known_hosts`);
	await execCmd(`touch ~/.ssh/config`);

	if (isMac()) {
		await execCmd(
			`echo "Host ${gitProviderDomain[gitProvider]}\n	UseKeychain yes\n	AddKeysToAgent yes\n	IdentityFile ${privateIdRsaFile}" >> ~/.ssh/config`
		);
	} else {
		await execCmd(`echo "Host ${gitProviderDomain[gitProvider]}\n	AddKeysToAgent yes\n	IdentityFile ${privateIdRsaFile}" >> ~/.ssh/config`);
	}
	// await execCmd(`ssh -T git@${gitProviderDomain[gitProvider]}`);

	switch (gitProvider) {
		case "bitbucket":
			await execCmd(`ssh -o StrictHostKeyChecking=no -T git@bitbucket.org`, "Bitbucket authentication failed");
			break;

		case "github":
			await execCmd(`ssh -o StrictHostKeyChecking=no -T git@github.com`, "Github authentication failed");
			break;

		case "gitlab":
			await execCmd(`ssh -o StrictHostKeyChecking=no -T git@gitlab.com`, "Gitlab authentication failed");

		default:
			logError(`Provider "${gitProvider}" is not valid.`);
			return false;
			break;
	}

	logSuccess(`${capitalize(gitProvider)} was authenticated successfully.`);
	return true;
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
