import { logError } from "diginext-utils/dist/xconsole/log";
import { existsSync } from "fs";
import _, { last, startsWith, trimEnd } from "lodash";
import path from "path";
import type { SimpleGit, SimpleGitProgressEvent } from "simple-git";
import { simpleGit } from "simple-git";

import type { GitProviderType } from "@/interfaces/SystemTypes";
import { deleteFolderRecursive } from "@/plugins";

import type { GitRepoData, PullOrCloneRepoURLOptions } from "./git-interfaces";

/**
 * Get current git branch
 */
export const getCurrentGitBranch = async (dir = process.cwd()) => {
	const git = simpleGit(dir, { binary: "git" });
	const status = await git.status();
	const curBranch = status.current;
	return curBranch;
};

/**
 * Get latest tag of the git repository
 */
export async function getLatestTagOfGitRepo(dir = process.cwd()) {
	const git = simpleGit(dir, { binary: "git" });
	const tags = (await git.tags(["--sort", "creatordate"])).all || [];
	const latestTag = tags.length > 0 ? (last(tags) as string) : await getCurrentGitBranch(dir);
	return latestTag;
}

interface GitStageOptions {
	directory?: string;
	message?: string;
}

export async function isUnstagedFiles(dir = process.cwd()) {
	const git = simpleGit(dir);
	try {
		const status = await git.status();
		// Extract the list of unstaged files from the status object
		const unstagedFiles = status.files.filter((file) => file.index === "M" || file.working_dir === "M");
		return unstagedFiles.length > 0;
	} catch (error) {
		return false;
	}
}

/**
 * Stage all files, commit them & push to git origin.
 */
export async function stageCommitAndPushAll(options: GitStageOptions) {
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

/**
 * Read git data in a repo SSH url
 * @param {string} repoSSH - Example: `git@bitbucket.org:organization-name/git-repo-slug.git`
 */
export function parseGitRepoDataFromRepoSSH(repoSSH: string): GitRepoData {
	let org: string, repoSlug: string, gitDomain: string, providerType: GitProviderType;

	let fullSlug: string;

	try {
		org = repoSSH.split(":")[1].split("/")[0];
	} catch (e) {
		logError(`Unable to parse "org": Repository SSH (${repoSSH}) is invalid`);
		return;
	}

	try {
		repoSlug = repoSSH.indexOf(".") > -1 ? repoSSH.split(":")[1].split("/")[1].split(".")[0] : repoSSH.split(":")[1].split("/")[1];
	} catch (e) {
		logError(`Unable to parse "slug": Repository SSH (${repoSSH}) is invalid`);
		return;
	}

	try {
		gitDomain = repoSSH.split(":")[0].split("@")[1];
	} catch (e) {
		logError(`Unable to parse "domain": Repository SSH (${repoSSH}) is invalid`);
		return;
	}

	try {
		providerType = gitDomain.split(".")[0] as GitProviderType;
	} catch (e) {
		logError(`Unable to parse "provider": Repository SSH (${repoSSH}) is invalid`);
		return;
	}

	fullSlug = `${org}/${repoSlug}`;

	return { namespace: org, repoSlug, fullSlug, gitDomain, providerType };
}

/**
 * Read git data in a git repo url
 * @param {string} repoURL - Example: `https://bitbucket.org/organization-name/git-repo-slug`
 */
export function parseGitRepoDataFromRepoURL(repoURL: string): GitRepoData {
	let namespace: string, repoSlug: string, gitDomain: string, providerType: GitProviderType;

	let fullSlug: string;

	repoURL = trimEnd(repoURL, "/");
	repoURL = trimEnd(repoURL, "#");
	if (repoURL.indexOf(".git") > -1) repoURL = repoURL.substring(0, repoURL.indexOf(".git"));
	if (repoURL.indexOf("?") > -1) repoURL = repoURL.substring(0, repoURL.indexOf("?"));
	// console.log(repoURL);

	[gitDomain, namespace, repoSlug] = repoURL.split("://")[1].split("/");

	try {
		providerType = gitDomain.split(".")[0] as GitProviderType;
	} catch (e) {
		console.error(`Repository URL (${repoURL}) is invalid.`);
		return;
	}

	fullSlug = `${namespace}/${repoSlug}`;

	return { namespace, repoSlug, fullSlug, gitDomain, providerType };
}

/**
 * Generate git repo SSH url from a git repo URL
 * @example "git@github.com:digitopvn/diginext.git" -> "https://github.com/digitopvn/diginext"
 */
export function repoSshToRepoURL(repoSSH: string) {
	const repoData = parseGitRepoDataFromRepoSSH(repoSSH);
	if (!repoData) throw new Error(`Unable to parse: ${repoSSH}`);
	return `https://${repoData.gitDomain}/${repoData.fullSlug}`;
}

/**
 * Generate git repo URL from a git repo SSH url
 * @example "https://github.com/digitopvn/diginext" -> "git@github.com:digitopvn/diginext.git"
 */
export function repoUrlToRepoSSH(repoURL: string) {
	const repoData = parseGitRepoDataFromRepoURL(repoURL);
	if (!repoData) throw new Error(`Unable to parse: ${repoURL}`);
	return `git@${repoData.gitDomain}:${repoData.fullSlug}.git`;
}

export function validateRepoURL(url: string) {
	if (!url) throw new Error(`Repo URL is empty.`);
	if (!startsWith(url, "https")) throw new Error(`Repo URL should start with "https".`);
	// if (!endsWith(url, ".git")) throw new Error(`Repo URL should end with ".git".`);
}

export function isValidRepoURL(url: string) {
	try {
		validateRepoURL(url);
		return true;
	} catch (e) {
		return false;
	}
}

export function isValidBase64(str: string): boolean {
	const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
	return base64Regex.test(str);
}

export function injectAuthToRepoURL(url: string, options: { type: "Bearer" | "Basic"; token: string }) {
	// validate
	validateRepoURL(url);

	if (!options.type) options.type = "Bearer";
	if (!options.token)
		throw new Error(
			options.type === "Bearer" ? `Personal access token is required.` : "Token (username and password encoded in BASE64) is required."
		);

	// basic auth
	if (options.type === "Basic" && !isValidBase64(options.token)) throw new Error(`Token should be a valid Base64 encoded string.`);
	const basicAuth = options.type === "Basic" ? Buffer.from(options.token, "base64") : undefined;
	if (options.type === "Basic" && !basicAuth) throw new Error(`Token (username and password encoded in BASE64) is required.`);

	// repo data
	const repoData = parseGitRepoDataFromRepoURL(url);

	return options.type === "Bearer"
		? `https://oauth2:${options.token}@${repoData.gitDomain}/${repoData.fullSlug}.git`
		: `https://${basicAuth}@${repoData.gitDomain}/${repoData.fullSlug}.git`;
}

export const pullOrCloneGitRepoHTTP = async (repoURL: string, dir: string, branch: string, options: PullOrCloneRepoURLOptions) => {
	let git: SimpleGit;
	let success: boolean = false;

	if (!options.useAccessToken) throw new Error(`Access token is required to pull/clone repo with HTTPS.`);
	const repoUrlWithAuth = injectAuthToRepoURL(repoURL, { type: options.useAccessToken.type, token: options.useAccessToken.value });

	if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > repoUrlWithAuth :>> ", repoUrlWithAuth);
	if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > repoURL :>> ", repoURL);
	if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > dir :>> ", dir);
	// if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > options :>> ", options);

	const onProgress = (event: SimpleGitProgressEvent) => {
		console.log("pullOrCloneGitRepoHTTP > event :>> ", event);
		const { method, stage, progress } = event || {};
		const message = `git.${method} ${stage} stage ${progress}% complete`;
		if (options?.onUpdate) options?.onUpdate(message, progress);
	};

	if (existsSync(dir)) {
		try {
			if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > directory exists :>> try to PULL...");
			git = simpleGit(dir, { progress: onProgress });
			// -----------------------
			// CAUTION: DO NOT SET TO "FALSE"
			// -----------------------
			const remotes = ((await git.getRemotes(true)) || []).filter((remote) => remote.name === "origin");
			const originRemote = remotes[0] as any;
			if (!originRemote) throw new Error(`This directory doesn't have any git remotes.`);
			if (options?.isDebugging) console.log("originRemote :>> ", originRemote, `>`, { repoURL });

			if (originRemote?.refs?.fetch !== repoURL) {
				await git.removeRemote("origin");
				await git.addRemote("origin", repoUrlWithAuth);
			}

			const curBranch = await getCurrentGitBranch(dir);
			await git.pull("origin", curBranch, ["--no-ff"]);

			// remove git on finish
			if (options?.removeGitOnFinish) await deleteFolderRecursive(path.join(dir, ".git"));
			if (options?.removeCIOnFinish) await deleteFolderRecursive(path.join(dir, ".github"));

			success = true;
		} catch (e) {
			if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > Failed to PULL :>> try to CLONE...", e);
			if (options?.onUpdate) options?.onUpdate(`Failed to pull "${repoURL}" in "${dir}" directory (${e.message}) -> trying to clone new...`);

			try {
				// just for sure...
				await deleteFolderRecursive(dir);

				// for CLI create new app from a framework
				git = simpleGit({ progress: onProgress });

				await git.clone(repoUrlWithAuth, dir, [`--branch=${branch}`, "--single-branch", "--depth=1"]);
				if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > Success to CLONE !");

				// remove git on finish
				if (options?.removeGitOnFinish) await deleteFolderRecursive(path.join(dir, ".git"));
				if (options?.removeCIOnFinish) await deleteFolderRecursive(path.join(dir, ".github"));

				success = true;
			} catch (e2) {
				if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > Failed to PULL & CLONE :>> ", e2);
				if (options?.onUpdate) options?.onUpdate(`Failed to SSH clone "${repoURL}" (${branch}) to "${dir}" directory: ${e2.message}`);
				throw new Error(`Failed to SSH clone "${repoURL}" (${branch}) to "${dir}" directory: ${e2.message}`);
			}
		}
	} else {
		if (options?.isDebugging) console.log("pullOrCloneGitRepoHTTP() > directory NOT exists :>> try to CLONE instead...");
		if (options?.onUpdate) options?.onUpdate(`[HTTP] Cache source code not found. Cloning "${repoURL}" (${branch}) to "${dir}" directory.`);

		try {
			git = simpleGit({ progress: onProgress });

			await git.clone(repoUrlWithAuth, dir, [`--branch=${branch}`, "--single-branch", "--depth=1"]);
			if (options?.isDebugging) console.log("✅ pullOrCloneGitRepoHTTP() > Success to CLONE !");

			// remove git on finish
			if (options?.removeGitOnFinish) await deleteFolderRecursive(path.join(dir, ".git"));
			if (options?.removeCIOnFinish) await deleteFolderRecursive(path.join(dir, ".github"));

			success = true;
		} catch (e) {
			if (options?.isDebugging) console.error(`❌ pullOrCloneGitRepoHTTP() > Failed to CLONE: ${e}`);
			if (options?.onUpdate) options?.onUpdate(`[HTTP] Failed to clone "${repoURL}" (${branch}) to "${dir}" directory: ${e}`);
			throw new Error(`[HTTP] Failed to clone "${repoURL}" (${branch}) to "${dir}" directory: ${e}`);
		}
	}

	return success;
};
