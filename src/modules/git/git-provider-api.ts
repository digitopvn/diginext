import axios from "axios";
import { logWarn } from "diginext-utils/dist/xconsole/log";
import { upperFirst } from "lodash";

import type { IGitProvider } from "@/entities";
import { respondFailure, respondSuccess } from "@/interfaces";
import type { BitbucketOrg, BitbucketProject, BitbucketRepoBranch, BitbucketRepository, BitbucketUser } from "@/interfaces/bitbucket";
import type { GitHubOrg, GithubRepoBranch, GithubRepository, GithubUser } from "@/interfaces/github";
import type { GitProviderType, RequestMethodType } from "@/interfaces/SystemTypes";
import { makeSlug } from "@/plugins/slug";

type GitProviderApiOptions = {
	/**
	 * Mark `TRUE` if this is a personal repo API
	 * @default false
	 */
	isPersonalRepo?: boolean;
	method?: RequestMethodType;
	data?: any;
	headers?: any;
	isDebugging?: boolean;
};

const githubApiBaseURL = "https://api.github.com";
const bitbucketApiBaseURL = "https://api.bitbucket.org/2.0";

const userApiPath = (provider: GitProviderType, org?: string) => (provider === "bitbucket" ? "/user" : provider === "github" ? "/user" : undefined);

const userOrgApiPath = (provider: GitProviderType, org?: string) =>
	provider === "bitbucket" ? "/workspaces" : provider === "github" ? "/user/orgs" : undefined;

const repoApiPath = (provider: GitProviderType, org?: string, slug?: string) =>
	provider === "bitbucket" ? `/repositories/${org}${slug ? `/${slug}` : ""}` : provider === "github" ? `/repos/${org}/${slug}` : undefined;

const userRepoApiPath = (provider: GitProviderType, username?: string, slug?: string) =>
	provider === "bitbucket"
		? `/repositories/${username}${slug ? `/${slug}` : ""}`
		: provider === "github"
			? `/user${username ? `/${username}` : ""}/repos`
			: undefined;

const orgRepoApiPath = (provider: GitProviderType, org?: string, slug?: string) =>
	provider === "bitbucket" ? `/repositories/${org}${slug ? `/${slug}` : ""}` : provider === "github" ? `/orgs/${org}/repos` : undefined;

const repoDeleteApiPath = (provider: GitProviderType, org: string, slug: string) =>
	provider === "bitbucket" ? `/repositories/${org}/${slug}` : `/repos/${org}/${slug}`;

const repoBranchApiPath = (provider: GitProviderType, org: string, slug: string) =>
	provider === "bitbucket" ? `/repositories/${org}/${slug}/refs/branches` : `/repos/${org}/${slug}/branches`;

/**
 * Only applicable for Bitbucket
 */
const orgProjectApiPath = (provider: IGitProvider) => `/workspaces/${provider.org}/projects/DXP`;

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

export interface GitOrg {
	id: string;
	name: string;
	url: string;
	description: string;
	/**
	 * `false` if this is a personal account
	 */
	is_org: boolean;
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

export interface GitRepoBranch {
	name: string;
	url: string;
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
	const { DB } = await import("../api/DB");

	const { method = "GET", data, headers = {} } = options;

	const baseURL = provider.type === "github" ? githubApiBaseURL : bitbucketApiBaseURL;
	const func = `[${provider.type.toUpperCase()}_API_ERROR]`;

	if (provider.type === "github") headers.Accept = "application/vnd.github+json";
	if (provider.type === "bitbucket") headers.Accept = "application/json";

	headers.Authorization = `${upperFirst(provider.method)} ${provider.access_token}`;
	if (options?.isDebugging) console.log("Git Provider API > headers :>> ", headers);

	const url = `${baseURL}${path}`;
	if (options?.isDebugging) console.log(`Git Provider API > [${method}] :>> `, url);
	if (options?.isDebugging) console.log(`Git Provider API > data :>> `, data);

	try {
		const response = await axios({ url, headers, method, data });
		// if (options?.isDebugging) console.log("Git Provider API > response :>> ", response);
		const resData = response.data;

		// catch errors
		if (provider.type === "bitbucket" && resData.error) throw new Error(`${func} "${path}" > ${resData.error.message}`);
		if (provider.type === "github" && resData.message) throw new Error(`${func} "${path}" > ${resData.message}`);

		// [BITBUCKET ONLY] if access_token is expired -> try to refresh it:
		if (provider.type === "bitbucket" && resData.error?.message?.indexOf("expired") > -1) {
			const tokens = await bitbucketRefeshToken(provider);

			// save new tokens to database
			const updatedProvider = await DB.updateOne("git", { _id: provider._id }, tokens);

			if (!updatedProvider)
				throw new Error(`[${provider.type.toUpperCase()}_API_ERROR] "${path}" > Can't update tokens to "${provider.name}" git provider.`);

			// fetch api again
			return api(updatedProvider, path, options);
		}

		// [DELETE ONLY] translate HTTP response
		if (method === "DELETE")
			return response.status === 204
				? respondSuccess({ data: true })
				: respondFailure(response.status === 403 ? "Unauthorized." : "404 Not found.");

		return resData;
	} catch (e) {
		console.log(url);
		throw new Error(e);
	}
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
		// console.log("bitbucketOrgsRes :>> ", bitbucketOrgsRes);
		return bitbucketOrgsRes.values.map((org) => {
			return {
				id: org.uuid,
				name: org.slug,
				description: "",
				url: org.links.html.href,
				is_org: true,
			} as GitOrg;
		});
	}

	if (provider.type === "github") {
		const githubOrgs = (await api(provider, userOrgApiPath(provider.type))) as GitHubOrg[];
		const profile = await getProfile(provider);
		const orgList = githubOrgs.map((org) => {
			return {
				id: org.id.toString(),
				name: org.login,
				description: org.description,
				url: org.url,
				is_org: true,
			} as GitOrg;
		});
		// push personal git provider
		orgList.push({
			id: profile.id,
			name: profile.username,
			description: `Personal Github account.`,
			url: profile.url,
			is_org: false,
		});
		return orgList;
	}

	throw new Error(`Git provider "${provider.type}" is not supported yet.`);
};

const createGitRepository = async (provider: IGitProvider, data: GitRepositoryDto, options?: { isDebugging?: boolean }) => {
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
		const newBitbucketRepo = (await api(provider, orgRepoApiPath(provider.type, provider.org, data.name), {
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
		const url = provider.isOrg ? orgRepoApiPath(provider.type, provider.org) : userRepoApiPath(provider.type);
		const newGithubRepo = (await api(provider, url, {
			data: {
				...data,
				has_issues: true,
				has_wiki: true,
			},
			method: "POST",
			isDebugging: options?.isDebugging,
		})) as GithubRepository & GithubFailureResponse;

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

const listGitRepositories = async (provider: IGitProvider, options?: { isDebugging?: boolean }) => {
	if (provider.type === "bitbucket") {
		const { values: bitbucketRepos } = (await api(provider, orgRepoApiPath(provider.type, provider.org))) as BitbucketOrgRepoListResponse;

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
		const apiUrl = provider.isOrg ? orgRepoApiPath(provider.type, provider.org) : userRepoApiPath(provider.type, provider.org);
		// console.log("apiUrl :>> ", apiUrl);
		const githubRepos = (await api(provider, apiUrl)) as GithubRepository[];
		// console.log("githubRepos :>> ", githubRepos);

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

export const deleteGitRepository = async (provider: IGitProvider, org: string, slug: string, options?: { isDebugging?: boolean }) => {
	const apiPath = repoDeleteApiPath(provider.type, org, slug);
	const res = await api(provider, apiPath, { method: "DELETE" });
	return res;
};

export const listRepoBranches = async (provider: IGitProvider, org: string, slug: string, options?: { isDebugging?: boolean }) => {
	const apiPath = repoBranchApiPath(provider.type, org, slug);
	const res = await api(provider, apiPath);

	if (provider.type === "bitbucket") {
		return (res as BitbucketResponse & { values: BitbucketRepoBranch[] }).values.map(
			(branch) => ({ name: branch.name, url: branch.links.html.href }) as GitRepoBranch
		);
	}
	if (provider.type === "github") {
		return (res as GithubRepoBranch[]).map(
			(branch) => ({ name: branch.name, url: `https://github.com/${org}/${slug}/tree/${branch.name}` }) as GitRepoBranch
		);
	}

	throw new Error(`Git provider "${provider.type}" is not supported.`);
};

const GitProviderAPI = {
	getProfile,
	listOrgs,
	listGitRepositories,
	createGitRepository,
	deleteGitRepository,
	listRepoBranches,
};

export default GitProviderAPI;
