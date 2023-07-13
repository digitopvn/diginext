export interface BitbucketUser {
	display_name: string;
	links: {
		self: {
			href: string;
		};
		avatar: {
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
		hooks: {
			href: string;
		};
	};
	created_on: string;
	type: string;
	uuid: string;
	has_2fa_enabled: null;
	username: string;
	is_staff: boolean;
	account_id: string;
	nickname: string;
	account_status: string;
	location: string;
}
