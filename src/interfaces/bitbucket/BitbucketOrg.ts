export interface BitbucketOrg {
	uuid: string;
	links: {
		owners: {
			href: string;
		};
		self: {
			href: string;
		};
		repositories: {
			href: string;
		};
		snippets: {
			href: string;
		};
		html: {
			href: string;
		};
		avatar: {
			href: string;
		};
		members: {
			href: string;
		};
		projects: {
			href: string;
		};
	};
	created_on: string;
	type: string;
	slug: string;
	is_private: boolean;
	name: string;
}
