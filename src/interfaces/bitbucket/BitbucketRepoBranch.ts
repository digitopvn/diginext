interface AuthorLink {
	href: string;
}

interface Author {
	type: string;
	raw: string;
	user: {
		display_name: string;
		links: {
			self: AuthorLink;
			avatar: AuthorLink;
			html: AuthorLink;
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
}

interface CommitLink {
	href: string;
}

interface Commit {
	type: string;
	hash: string;
	date: string;
	author: Author;
	message: string;
	links: {
		self: CommitLink;
		html: CommitLink;
		diff: CommitLink;
		approve: CommitLink;
		comments: CommitLink;
		statuses: CommitLink;
	};
	parents: {
		type: string;
		hash: string;
		links: {
			self: CommitLink;
			html: CommitLink;
		};
	}[];
}

interface RepositoryLink {
	href: string;
}

interface Repository {
	type: string;
	full_name: string;
	links: {
		self: RepositoryLink;
		html: RepositoryLink;
		avatar: RepositoryLink;
	};
	name: string;
	uuid: string;
}

interface BranchLink {
	href: string;
}

interface Branch {
	self: BranchLink;
	commits: BranchLink;
	html: BranchLink;
}

interface MergeRequest {
	name: string;
	target: {
		type: string;
		hash: string;
		date: string;
		author: Author;
		message: string;
		links: {
			self: CommitLink;
			html: CommitLink;
			diff: CommitLink;
			approve: CommitLink;
			comments: CommitLink;
			statuses: CommitLink;
		};
		parents: {
			type: string;
			hash: string;
			links: {
				self: CommitLink;
				html: CommitLink;
			};
		}[];
		repository: Repository;
	};
	links: {
		self: BranchLink;
		commits: BranchLink;
		html: BranchLink;
	};
	type: string;
	merge_strategies: string[];
	default_merge_strategy: string;
}

export interface BitbucketRepoBranch {
	name: string;
	target: Commit;
	links: Branch;
	type: string;
	merge_strategies: string[];
	default_merge_strategy: string;
}
