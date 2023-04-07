import axios from "axios";
import { isJSON } from "class-validator";
import { logError, logSuccess } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import open from "open";

import { Config } from "@/app.config";
import { getCliConfig, saveCliConfig } from "@/config/config";
import type { RequestMethodType } from "@/interfaces/SystemTypes";
import { paramsToObject } from "@/plugins/params";

export const DIGINEXT_GITHUB_CLIENT_ID = "Iv1.04ab669eff50438b";
export const DIGINEXT_GITHUB_CLIENT_SECRET = "97cc3937637843033cc2877405f12a9281331a9d";

export type GithubApiRequestOptions = {
	url: string;
	method?: RequestMethodType;
	data?: any;
	headers?: any;
};

export type GithubApiFailResponse = {
	message?: string;
	documentation_url?: string;
};

export type GithubAccessTokenInfo = {
	access_token?: string;
	expires_in?: number;
	refresh_token?: string;
	refresh_token_expires_in?: number;
	token_type?: string;
	error?: string;
	error_description?: string;
	error_uri?: string;
};

export type GithubProfile = {
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
	company: string;
	blog: string;
	location: string;
	email: string;
	hireable: boolean;
	bio: string;
	twitter_username: string;
	public_repos: number;
	public_gists: number;
	followers: number;
	following: number;
	created_at: string;
	updated_at: string;
};

const Github = {
	login: async () => {
		const authCallbackURL = `${Config.DX_SITE_URL}/github/callback`;

		open(`https://github.com/login/oauth/authorize?client_id=${DIGINEXT_GITHUB_CLIENT_ID}&redirect_uri=${authCallbackURL}`);

		const { access_token } = await inquirer.prompt<{ access_token: string }>({
			type: "password",
			name: "access_token",
			message: `Github OAuth access token:`,
			validate: function (value) {
				if (value.length) {
					return true;
				} else {
					return "Github access token is required.";
				}
			},
		});
		// console.log("access_token :>> ", access_token);

		saveCliConfig({ github_access_token: access_token });

		// get github profile
		try {
			const profile = await Github.profile();
			logSuccess(`Congrats, ${profile.name}! Your github has been integrated to Diginext CLI successfully.`);
		} catch (e) {
			logError(e.message);
		}
	},
	logout: async () => {
		saveCliConfig({ github_access_token: "" });
		logSuccess(`Logged out from Github account successfully.`);
	},
	profile: async () => {
		const profile = (await Github.fetchApi({ url: "https://api.github.com/user" })) as GithubProfile & GithubApiFailResponse;
		if (profile.message) throw new Error(`${profile.message}: ${profile.documentation_url}`);
		return profile;
	},
	fetchApi: async (options: GithubApiRequestOptions) => {
		const { url, method = "GET", headers: inputHeaders = {}, data = {} } = options;
		const { github_access_token = "" } = getCliConfig();

		// headers
		const headers = { Accept: "application/vnd.github+json", ...inputHeaders } as any;
		if (github_access_token) headers.Authorization = `Bearer ${github_access_token}`;

		// make a request
		const res = await axios({ url, data, method, headers });

		// response data
		if (isJSON(res.data)) {
			return JSON.parse(res.data);
		} else {
			if (res.data.toString().indexOf("&") > -1) {
				return paramsToObject(new URLSearchParams(res.data));
			} else {
				return res.data;
			}
		}
	},
	refreshToken: async () => {},
};

export default Github;
