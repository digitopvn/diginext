import type { InputOptions } from "@/interfaces";
import type { GitProviderType } from "@/interfaces/SystemTypes";

export interface GitRepoData {
	namespace: string;
	repoSlug: string;
	/**
	 * @example org-slug/repo-slug
	 */
	fullSlug: string;
	/**
	 * @example github.com, bitbucket.org,...
	 */
	gitDomain: string;
	/**
	 * Git provider type
	 */
	providerType: GitProviderType;
}

export interface PullOrCloneGitRepoSSHOptions extends Pick<InputOptions, "ci" | "isDebugging"> {
	/**
	 * Should remove ".git" directory after finished pull/clone repo
	 * @default false
	 */
	removeGitOnFinish?: boolean;
	/**
	 * Should remove ".github" directory after finished pull/clone repo
	 * @default false
	 */
	removeCIOnFinish?: boolean;
	/**
	 * Callback for in progressing events
	 */
	onUpdate?: (msg: string, progress?: number) => void;
}

export interface PullOrCloneRepoURLOptions extends PullOrCloneGitRepoSSHOptions {
	useAccessToken: {
		type: "Bearer" | "Basic";
		value: string;
	};
}
