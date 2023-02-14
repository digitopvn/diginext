import chalk from "chalk";
// import { auth } from "./index.js";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import type { SimpleGit } from "simple-git";
import { simpleGit } from "simple-git";

import type { InputOptions } from "@/interfaces/InputOptions";

import { parseRepoSlugFromUrl } from "../../plugins/utils";
import { bitbucket } from ".";

let git: SimpleGit;
let auth = { username: "" };

async function processCreatingPullRequest(repoSlug, fromBranch, destBranch, options: InputOptions) {
	if (!git) git = simpleGit(options.targetDirectory || "./", { binary: "git" });
	// merge origin/DEST_BRANCH with FROM_BRANCH
	try {
		await git.add("./*");
		await git.commit("Commit all files to create PR");
		await git.push();
		if (fromBranch != "master" || fromBranch != "staging" || fromBranch != "prod") {
			await git.mergeFromTo("origin/" + destBranch, fromBranch);
		}
	} catch (e) {
		log(e.toString());
	}

	let message = `${auth.username} is requesting to merge "${fromBranch}" -> "${destBranch}"`;
	log(message);

	let params = {
		title: message,
		source: {
			branch: {
				name: fromBranch,
			},
		},
		destination: {
			branch: {
				name: destBranch,
			},
		},
	};

	// TODO: get workspace name from git provider
	const workspace = "digitopvn";

	try {
		let res = await bitbucket.repositories.createPullRequest({
			workspace: workspace,
			repo_slug: repoSlug,
			_body: params,
		});
		// log(res.data);
		let prID = res.data.id;

		// AUTO MERGE if NOT CONFLICTED
		if (prID && options && options.shouldMerge == true) {
			try {
				const _res = await bitbucket.repositories.mergePullRequest({
					pull_request_id: prID,
					repo_slug: repoSlug,
					workspace: workspace,
				});

				if (_res && _res.data && _res.data.links) {
					logSuccess(`Approved PR: ${chalk.blue(_res.data.links.html.href)}`);
				}
			} catch (e) {
				logWarn(e);
			}
		} else {
			logSuccess(`Review here: ${chalk.blue(res.data.links.html.href)}`);
		}
	} catch (e) {
		// console.log('e', e)
		logError(e);
	}
}

export const createPullRequest = async (options: InputOptions) => {
	auth.username = options.username;

	// diginext git pr master
	if (!git) git = simpleGit(options.targetDirectory || "./", { binary: "git" });
	const gitStatus = await git.status(["-s"]);

	// get repo URL & repo slug
	const commands = ["config", "--get", "remote.origin.url"];
	const repoURL = await git.raw(commands);
	const repoSlug = parseRepoSlugFromUrl(repoURL);

	if (!gitStatus.current) {
		await logError("Can't fetch current git repository status");
	}

	let fromBranch = decodeURIComponent(gitStatus.current);
	let destBranch = options.thirdAction || "master";
	if (options.fourAction) {
		fromBranch = decodeURIComponent(options.thirdAction);
		destBranch = decodeURIComponent(options.fourAction);
	}

	// check for multiple destinations
	if (destBranch.indexOf(",") > -1) {
		const destBranches = destBranch.split(",");
		for (let i = 0; i < destBranches.length; i++) {
			const dest = destBranches[i];
			await processCreatingPullRequest(repoSlug, fromBranch, dest, options);
		}
	} else {
		await processCreatingPullRequest(repoSlug, fromBranch, destBranch, options);
	}
};
