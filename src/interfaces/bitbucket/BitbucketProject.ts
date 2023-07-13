export interface BitbucketProject {
	type: string;
	owner: {
		display_name: string;
		links: {
			self: {
				href: string;
			};
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		username: string;
	};
	workspace: {
		type: string;
		uuid: string;
		name: string;
		slug: string;
		links: {
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
			self: {
				href: string;
			};
		};
	};
	key: string;
	uuid: string;
	is_private: boolean;
	name: string;
	description: string;
	links: {
		self: {
			href: string;
		};
		html: {
			href: string;
		};
		repositories: {
			href: string;
		};
		avatar: {
			href: string;
		};
	};
	created_on: string;
	updated_on: string;
	has_publicly_visible_repos: boolean;
}
