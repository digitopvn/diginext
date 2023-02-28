import { logWarn } from "diginext-utils/dist/console/log";
import simpleGit from "simple-git";

import { getCliConfig } from "../../config/config";
import type { InputOptions } from "../../interfaces/InputOptions";
import { logBitbucketError } from "../../plugins/utils";
import { bitbucket, signInBitbucket } from ".";
import { applyBranchPermissions } from "./permissions";
import { bitbucketAuthentication } from "./promptForAuthOptions";

/**
 * Create new Bitbucket repository
 */
export async function createBitbucketRepo(options: InputOptions) {
	// authenticate bitbucket first:
	await bitbucketAuthentication(options);
	await signInBitbucket(options);

	const { currentGitProvider } = getCliConfig();
	// log("options.repoSlug :>> ", options.repoSlug);

	// Remove existing bitbucket repository (if overwrite is set)
	if (options.overwrite) {
		try {
			await bitbucket.repositories.delete({
				workspace: currentGitProvider.gitWorkspace,
				repo_slug: options.repoSlug,
			});
		} catch (e) {
			// logBitbucketError(e, 400);
			// logWarn(e);
		}
	}

	// Create new bitbucket repository
	try {
		await bitbucket.repositories.create({
			workspace: currentGitProvider.gitWorkspace,
			repo_slug: options.repoSlug,
			_body: {
				name: `${options.projectName} - ${options.name}`,
				is_private: true,
				scm: "git",
				// TODO: identify repo project?
				project: { key: "WA" },
			},
		});
		// logBitbucket("CREATE REPO", data, 400)
	} catch (e) {
		logBitbucketError(e);
	}
}

/**
 * Initialize bitbucket repository for new project
 * @deprecated
 */
export async function initializeBitbucket(options: InputOptions) {
	const { currentGitProvider } = getCliConfig();

	if (options.shouldUseGit) {
		// Remove existing bitbucket repository (if overwrite is set)
		if (options.overwrite) {
			try {
				await bitbucket.repositories.delete({
					workspace: currentGitProvider.gitWorkspace,
					repo_slug: options.repoSlug,
				});
			} catch (e) {
				// logBitbucketError(e, 400);
				logWarn(e);
			}
		}

		// Create new bitbucket repository
		try {
			await bitbucket.repositories.create({
				workspace: currentGitProvider.gitWorkspace,
				repo_slug: options.slug,
				_body: {
					name: `${options.name} (${options.projectName})`,
					is_private: true,
					scm: "git",
					project: { key: "WA" },
				},
			});
			// logBitbucket("CREATE REPO", data, 400)
		} catch (e) {
			logBitbucketError(e);
		}
	}

	// Add remote git origin
	// log(`options.git >>`, options.git);
	// log(`options.remoteURL >>`, options.remoteURL);

	if (options.shouldUseGit) {
		// add git origin:
		// await execa.command(`cd ${options.targetDirectory} && git remote add origin ${options.remoteURL} && git push origin --all`);
		const git = simpleGit(options.targetDirectory, { binary: "git" });
		await git.addRemote("origin", options.remoteURL);
		await git.push("origin", "master");
		await applyBranchPermissions(options, "master", "pull-request-only", "push", []);
		// logError('options.remoteURL', options.remoteURL);
		return true;

		// await git.addRemote("origin", options.remoteURL);
		// await git.push("origin", "master");
		// await git.push("origin", "staging");
		// await git.push("origin", "prod");
		// await git.push("origin", `dev/${options.username}`);

		// // Enable bitbucket pipelines:
		// await enablePipelines();

		// // Apply default branch restrictions:
		// await applyBranchPermissions(options, "master", "pull-request-only", "push", []);
		// await applyBranchPermissions(options, "staging", "pull-request-only", "push", []);
		// await applyBranchPermissions(options, "staging", "pull-request-only", "require_approvals_to_merge");
		// await applyBranchPermissions(options, "prod", "pull-request-only", "push", []);
		// await applyBranchPermissions(options, "prod", "pull-request-only", "restrict_merges");
	}

	// await git.checkout(["master"]);
	return true;
}
