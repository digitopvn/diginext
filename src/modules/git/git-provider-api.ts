import axios from "axios";
import { logWarn } from "diginext-utils/dist/xconsole/log";
import { upperFirst } from "lodash";

import type { IGitProvider } from "@/entities";
import type { GitProviderType, RequestMethodType } from "@/interfaces/SystemTypes";
import { makeSlug } from "@/plugins/slug";

import { DB } from "../api/DB";

type GitProviderApiOptions = { method?: RequestMethodType; data?: any; headers?: any };

const githubApiBaseURL = "https://api.github.com";
const bitbucketApiBaseURL = "https://api.bitbucket.org/2.0";

const userApiPath = (provider: GitProviderType, org?: string) => (provider === "bitbucket" ? "/user" : provider === "github" ? "/user" : undefined);
const userOrgApiPath = (provider: GitProviderType, org?: string) =>
	provider === "bitbucket" ? "/workspaces" : provider === "github" ? "/user/orgs" : undefined;
const orgRepoApiPath = (provider: GitProviderType, org?: string, slug?: string) =>
	provider === "bitbucket" ? `/repositories/${org}${slug ? `/${slug}` : ""}` : provider === "github" ? `/orgs/${org}/repos` : undefined;
const repoDeleteApiPath = (provider: GitProviderType, org: string, slug: string) =>
	provider === "bitbucket" ? `/repositories/${org}/${slug}` : `/repos/${org}/${slug}`;
/**
 * Only applicable for Bitbucket
 */
const orgProjectApiPath = (provider: IGitProvider) => `/workspaces/${provider.gitWorkspace}/projects/DXP`;

interface GithubFailureResponse {
	message?: string;
	documentation_url?: string;
}

interface BitbucketFailureResponse {
	type?: string;
	error?: {
		message: string;
	};
}

interface GitUser {
	id?: string;
	username?: string;
	display_name?: string;
	url?: string;
	email?: string;
}

interface BitbucketUser {
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

interface GithubUser {
	login: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id: string;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: string;
	site_admin: boolean;
	name: string;
	company: string | null;
	blog: string;
	location: string | null;
	email: string | null;
	hireable: boolean | null;
	bio: string | null;
	twitter_username: string | null;
	public_repos: number;
	public_gists: number;
	followers: number;
	following: number;
	created_at: string;
	updated_at: string;
}

interface BitbucketOrg {
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

interface BitbucketProject {
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

interface BitbucketRepository {
	type: string;
	full_name: string;
	links: {
		self: {
			href: string;
		};
		html: {
			href: string;
		};
		avatar: {
			href: string;
		};
		pullrequests: {
			href: string;
		};
		commits: {
			href: string;
		};
		forks: {
			href: string;
		};
		watchers: {
			href: string;
		};
		branches: {
			href: string;
		};
		tags: {
			href: string;
		};
		downloads: {
			href: string;
		};
		source: {
			href: string;
		};
		clone: {
			name: string;
			href: string;
		}[];
		hooks: {
			href: string;
		};
	};
	name: string;
	slug: string;
	description: string;
	scm: string;
	website: string;
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
	is_private: boolean;
	project: {
		type: string;
		key: string;
		uuid: string;
		name: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
			avatar: {
				href: string;
			};
		};
	};
	fork_policy: string;
	created_on: string;
	updated_on: string;
	size: number;
	language: string;
	has_issues: boolean;
	has_wiki: false;
	uuid: string;
	mainbranch: {
		name: string;
		type: string;
	};
	override_settings: {
		default_merge_strategy: boolean;
		branching_model: boolean;
	};
}

interface BitbucketResponse extends BitbucketFailureResponse {
	pagelen: number;
	size: number;
	page: number;
	next: string;
}

interface BitbucketOrgListResponse extends BitbucketResponse {
	values: BitbucketOrg[];
}

interface BitbucketOrgRepoListResponse extends BitbucketResponse {
	values: BitbucketRepository[];
}

interface BitbucketOrgProjectListResponse extends BitbucketResponse {
	values: BitbucketProject[];
}

type BitbucketOrgProjectResponse = BitbucketProject & BitbucketResponse;

interface GitHubOrg {
	login: string;
	id: number;
	node_id: string;
	url: string;
	repos_url: string;
	events_url: string;
	hooks_url: string;
	issues_url: string;
	members_url: string;
	public_members_url: string;
	avatar_url: string;
	description: string;
}

interface GitOrg {
	id: string;
	name: string;
	url: string;
	description: string;
}

interface GitHubOrgRepository {
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

export interface GitRepository {
	provider: GitProviderType;
	id: string;
	name: string;
	full_name: string;
	description: string;
	private: boolean;
	fork: boolean;
	repo_url: string;
	ssh_url: string;
	owner: {
		username: string;
		id: string;
		url: string;
		type: string;
	};
	created_at: string;
	updated_at: string;
}

export interface GitRepositoryDto {
	name: string;
	description?: string;
	private: boolean;
}

const bitbucketRefeshToken = async (provider: IGitProvider) => {
	const { refresh_token, bitbucket_oauth: options } = provider;
	const digested = Buffer.from(`${options.consumer_key}:${options.consumer_secret}`, "utf8").toString("base64");
	const bitbucketTokenRes = await axios({
		url: "https://bitbucket.org/site/oauth2/access_token",
		method: "POST",
		headers: {
			Authorization: `Basic ${digested}`,
			"Cache-Control": "no-cache",
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		data: JSON.stringify({
			grant_type: "refresh_token",
			refresh_token: refresh_token,
		}),
	});

	const data = bitbucketTokenRes.data;
	if ((data as BitbucketFailureResponse).error) throw new Error(`[BITBUCKET_API_ERROR] Refresh token was expired, can't refresh the access token.`);

	return {
		access_token: data.access_token as string,
		refresh_token: data.refresh_token as string,
	};
};

const api = async (provider: IGitProvider, path: string, options: GitProviderApiOptions = {}) => {
	const { method = "GET", data, headers = {} } = options;

	const baseURL = provider.type === "github" ? githubApiBaseURL : bitbucketApiBaseURL;
	const func = `[${provider.type.toUpperCase()}_API_ERROR]`;

	if (provider.type === "github") headers.Accept = "application/vnd.github+json";
	if (provider.type === "bitbucket") headers.Accept = "application/json";

	headers.Authorization = `${upperFirst(provider.method)} ${provider.access_token}`;

	const url = `${baseURL}${path}`;
	const response = await axios({ url, headers, method, data });
	const resData = response.data;

	// catch errors
	if (provider.type === "bitbucket" && resData.error) throw new Error(`${func} "${path}" > ${resData.error.message}`);
	if (provider.type === "github" && resData.message) throw new Error(`${func} "${path}" > ${resData.message}`);

	// [BITBUCKET ONLY] if access_token is expired -> try to refresh it:
	if (provider.type === "bitbucket" && resData.error?.message?.indexOf("expired") > -1) {
		const tokens = await bitbucketRefeshToken(provider);

		// save new tokens to database
		const [updatedProvider] = await DB.update<IGitProvider>("git", { _id: provider._id }, tokens);

		if (!updatedProvider)
			throw new Error(`[${provider.type.toUpperCase()}_API_ERROR] "${path}" > Can't update tokens to "${provider.name}" git provider.`);

		// fetch api again
		return api(updatedProvider, path, options);
	}

	return resData;
};

const getProfile = async (provider: IGitProvider) => {
	if (provider.type === "bitbucket") {
		const profile = (await api(provider, userApiPath(provider.type))) as BitbucketUser;
		return {
			id: profile.uuid,
			username: profile.username,
			display_name: profile.display_name,
			url: profile.links.html.href,
			// no email for bitbucket user?
		} as GitUser;
	}

	if (provider.type === "github") {
		const profile = (await api(provider, userApiPath(provider.type))) as GithubUser;
		return {
			id: profile.id.toString(),
			username: profile.login,
			display_name: profile.name,
			url: profile.html_url,
			email: profile.email,
		} as GitUser;
	}

	throw new Error(`Git provider "${provider.type}" is not supported yet.`);
};

const listOrgs = async (provider: IGitProvider) => {
	if (provider.type === "bitbucket") {
		const bitbucketOrgsRes = (await api(provider, userOrgApiPath(provider.type))) as BitbucketOrgListResponse;
		console.log("bitbucketOrgsRes :>> ", bitbucketOrgsRes);
		return bitbucketOrgsRes.values.map((org) => {
			return {
				id: org.uuid,
				name: org.slug,
				description: "",
				url: org.links.html.href,
			} as GitOrg;
		});
	}

	if (provider.type === "github") {
		const githubOrgs = (await api(provider, userOrgApiPath(provider.type))) as GitHubOrg[];
		return githubOrgs.map((org) => {
			return {
				id: org.id.toString(),
				name: org.login,
				description: org.description,
				url: org.url,
			} as GitOrg;
		});
	}

	throw new Error(`Git provider "${provider.type}" is not supported yet.`);
};

const createOrgRepository = async (provider: IGitProvider, data: GitRepositoryDto) => {
	// validation
	if (!data.name) data.name = makeSlug(data.name).toLocaleLowerCase();

	// process
	if (provider.type === "bitbucket") {
		// check if "Diginext" project existed
		const bitbucketProjectRes = (await api(provider, orgProjectApiPath(provider))) as BitbucketOrgProjectResponse;

		let dxProject: BitbucketOrgProjectResponse;

		if (bitbucketProjectRes.error) {
			logWarn(`[BITBUCKET_API_ERROR] ${bitbucketProjectRes.error.message}`);
		} else {
			dxProject = bitbucketProjectRes;
		}

		// if not, create "Diginext" project
		if (!dxProject) {
			const projectData = {
				name: "Diginext",
				key: "DXP",
				description: "Contains all repositories that created by Diginext platform.",
				is_private: true,
			};

			const dxProjectRes = (await api(provider, orgProjectApiPath(provider), {
				data: projectData,
				method: "POST",
			})) as BitbucketOrgProjectResponse;

			if (dxProjectRes.error) throw new Error(`[BITBUCKET_API_ERROR] ${bitbucketProjectRes.error.message}`);

			dxProject = dxProjectRes;
		}

		// console.log("dxProject :>> ", dxProject);

		// create new repository
		const newBitbucketRepo = (await api(provider, orgRepoApiPath(provider.type, provider.gitWorkspace, data.name), {
			data: {
				name: data.name,
				description: data.description,
				is_private: data.private,
				scm: "git",
				// assign "DXP" project to new repository:
				project: { key: dxProject.key },
			},
			method: "POST",
		})) as BitbucketRepository;
		// console.log("newBitbucketRepo :>> ", newBitbucketRepo);

		return {
			provider: provider.type,
			id: newBitbucketRepo.uuid,
			name: newBitbucketRepo.name,
			full_name: newBitbucketRepo.full_name,
			description: newBitbucketRepo.description,
			private: newBitbucketRepo.is_private,
			repo_url: newBitbucketRepo.links.html.href,
			ssh_url: newBitbucketRepo.links.clone.find((link) => link.name === "ssh").href,
			created_at: newBitbucketRepo.created_on,
			updated_at: newBitbucketRepo.updated_on,
			fork: newBitbucketRepo.fork_policy !== "no_public_forks",
			owner: {
				id: newBitbucketRepo.owner.uuid,
				username: newBitbucketRepo.owner.username,
				url: newBitbucketRepo.owner.links.html.href,
				type: newBitbucketRepo.owner.type,
			},
		} as GitRepository;
	}

	if (provider.type === "github") {
		const newGithubRepo = (await api(provider, orgRepoApiPath(provider.type, provider.gitWorkspace), {
			data: {
				...data,
				has_issues: true,
				has_wiki: true,
			},
			method: "POST",
		})) as GitHubOrgRepository & GithubFailureResponse;

		if (newGithubRepo.message) throw new Error(`[GITHUB_API_ERROR] ${newGithubRepo.message}`);

		return {
			provider: provider.type,
			id: newGithubRepo.id.toString(),
			name: newGithubRepo.name,
			full_name: newGithubRepo.full_name,
			description: newGithubRepo.description,
			private: newGithubRepo.private,
			repo_url: newGithubRepo.html_url,
			ssh_url: newGithubRepo.ssh_url,
			created_at: newGithubRepo.created_at,
			updated_at: newGithubRepo.updated_at,
			fork: newGithubRepo.fork,
			owner: {
				id: newGithubRepo.owner.id.toString(),
				username: newGithubRepo.owner.login,
				url: newGithubRepo.owner.url,
				type: newGithubRepo.owner.type,
			},
		} as GitRepository;
	}

	throw new Error(`Git provider "${provider.type}" is not supported yet.`);
};

const listOrgRepositories = async (provider: IGitProvider) => {
	if (provider.type === "bitbucket") {
		const { values: bitbucketRepos } = (await api(
			provider,
			orgRepoApiPath(provider.type, provider.gitWorkspace)
		)) as BitbucketOrgRepoListResponse;

		return bitbucketRepos.map((repo) => {
			return {
				id: repo.uuid,
				name: repo.name,
				full_name: repo.full_name,
				description: repo.description,
				private: repo.is_private,
				repo_url: repo.links.html.href,
				ssh_url: repo.links.clone.find((link) => link.name === "ssh").href,
				created_at: repo.created_on,
				updated_at: repo.updated_on,
				fork: repo.fork_policy !== "no_public_forks",
				owner: {
					id: repo.owner.uuid,
					username: repo.owner.username,
					url: repo.owner.links.html.href,
					type: repo.owner.type,
				},
			} as GitRepository;
		});
	}

	if (provider.type === "github") {
		const githubRepos = (await api(provider, orgRepoApiPath(provider.type, provider.gitWorkspace))) as GitHubOrgRepository[];

		return githubRepos.map((repo) => {
			return {
				id: repo.id.toString(),
				name: repo.name,
				full_name: repo.full_name,
				description: repo.description,
				private: repo.private,
				repo_url: repo.html_url,
				ssh_url: repo.ssh_url,
				created_at: repo.created_at,
				updated_at: repo.updated_at,
				fork: repo.fork,
				owner: {
					id: repo.owner.id.toString(),
					username: repo.owner.login,
					url: repo.owner.url,
					type: repo.owner.type,
				},
			} as GitRepository;
		});
	}

	throw new Error(`Git provider "${provider.type}" is not supported yet.`);
};

export const deleteOrgRepository = async (provider: IGitProvider, org: string, slug: string) => {
	const apiPath = repoDeleteApiPath(provider.type, org, slug);
	const res = await api(provider, apiPath, { method: "DELETE" });
	return res;
};

const GitProviderAPI = {
	getProfile,
	listOrgs,
	listOrgRepositories,
	createOrgRepository,
	deleteOrgRepository,
};

export default GitProviderAPI;
