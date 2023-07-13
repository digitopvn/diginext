interface Commit {
	sha: string;
	url: string;
}

interface Protection {
	required_status_checks: {
		enforcement_level: string;
		contexts: string[];
	};
}

export interface GithubRepoBranch {
	name: string;
	commit: Commit;
	protected: boolean;
	protection: Protection;
	protection_url: string;
}
