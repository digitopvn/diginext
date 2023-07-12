export interface GithubRepository {
	id: number;
	name: string;
	full_name: string;
	description: string;
	private: boolean;
	fork: boolean;
	html_url: string;
	git_url: string;
	ssh_url: string;
	owner: {
		login: string;
		id: number;
		url: string;
		type: string;
	};
	created_at: string;
	updated_at: string;
}
