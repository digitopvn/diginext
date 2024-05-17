import Agent, { HttpsAgent } from "agentkeepalive";
import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import { logError } from "diginext-utils/dist/xconsole/log";
import { url } from "inspector";

import { getCliConfig } from "@/config/config";

const keepAliveAgent = new Agent({
	maxSockets: 160,
	maxFreeSockets: 160,
	timeout: 60000,
	freeSocketTimeout: 30000,
	keepAliveMsecs: 60000,
});

const httpsKeepAliveAgent = new HttpsAgent({
	maxSockets: 160,
	maxFreeSockets: 160,
	timeout: 60000,
	freeSocketTimeout: 30000,
	keepAliveMsecs: 60000,
});

interface FetchApiOptions<T = any> extends AxiosRequestConfig {
	url: string;
	access_token?: string;
	api_key?: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	data?: T | any;
	isDebugging?: boolean;
}

export interface FetchApiResponse<T extends Object> {
	status?: 0 | 1;
	messages?: string[];
	data?: T | T[];
}

export async function fetchApi<T = any>(options: FetchApiOptions<T>) {
	const { access_token, api_key, method = "GET", isDebugging = false } = options;

	const {
		buildServerUrl = process.env.BASE_URL,
		currentUser,
		access_token: cachedAccessToken,
		refresh_token: cachedRefreshToken,
		apiToken: cachedApiKey,
	} = getCliConfig();

	if (options.isDebugging) {
		console.log("cachedAccessToken :>> ", cachedAccessToken);
		console.log("cachedRefreshToken :>> ", cachedRefreshToken);
		console.log("cachedApiKey :>> ", cachedApiKey);
	}

	if (!buildServerUrl) {
		logError(`"BUILD SERVER URL" not found. Please login with: "dx login <BUILD_SERVER_URL>"`);
		return {
			status: 0,
			messages: [`"BUILD SERVER URL" not found. Please login with: "dx login <BUILD_SERVER_URL>"`],
			data: null,
		} as FetchApiResponse<T>;
	}

	options.baseURL = buildServerUrl;
	options.maxContentLength = 200000000;
	options.maxBodyLength = 200000000;
	options.httpAgent = keepAliveAgent;
	options.httpsAgent = httpsKeepAliveAgent;

	if (access_token) {
		options.headers = { ...options.headers, Authorization: `Bearer ${access_token}` };
	} else if (cachedAccessToken) {
		options.headers = { ...options.headers, Authorization: `Bearer ${cachedAccessToken}` };
	} else if (currentUser?.token?.access_token) {
		options.headers = { ...options.headers, Authorization: `Bearer ${currentUser.token?.access_token}` };
	} else {
		options.headers = { ...options.headers };
	}

	// if "API_ACCESS_TOKEN" is defined, ignore "Bearer" token
	if (!options.headers.Authorization && (api_key || cachedApiKey)) {
		options.headers = { ...options.headers, "x-api-key": api_key || cachedApiKey };
	}

	// Inject "REFRESH_TOKEN" if any
	if (currentUser?.token?.refresh_token) {
		options.params = { refresh_token: currentUser.token.refresh_token };
	} else if (cachedRefreshToken) {
		options.params = { refresh_token: cachedRefreshToken };
	}

	if (!options.headers["content-type"]) options.headers["content-type"] = "application/json";

	if (options.data) options.data = JSON.stringify(options.data);

	if (isDebugging) console.log("options.url :>> ", options.baseURL + options.url);
	if (isDebugging) console.log("options.params :>> ", options.params);
	if (isDebugging) console.log("options.headers :>> ", options.headers);
	if (isDebugging) console.log("options.data :>> ", options.data);

	try {
		const { data: responseData } = await axios(options);
		return responseData as FetchApiResponse<T>;
	} catch (e) {
		if (e.toString().indexOf(`ECONNREFUSED`) > -1) {
			logError(`NETWORK ERROR: Cannot connect to the build server at "${url}".`);
		} else {
			logError(`${method} - ${options.url} - API ERROR:`, e);
		}
		return { status: 0, messages: [`Something went wrong: ${e.toString()}`], data: null } as FetchApiResponse<T>;
	}
}

export default fetchApi;
