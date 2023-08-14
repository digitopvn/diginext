import Table from "cli-table";
import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty, trimEnd } from "lodash";
import open from "open";

import { Config } from "@/app.config";
import { getCliConfig, saveCliConfig } from "@/config/config";
import type { IRole } from "@/entities";
import type { AccessTokenInfo, IUser } from "@/entities/User";
import type { IWorkspace } from "@/entities/Workspace";
import type InputOptions from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";
import { MongoDB } from "@/plugins/mongodb";

interface CliLoginOptions {
	/**
	 * URL of the build server, specify with the second action of CLI
	 */
	secondAction?: string;

	/**
	 * URL of the build server, specify with `--url` flag
	 */
	url?: string;

	/**
	 * The access token to authenticate, specify with `--token` or `--key` flag
	 */
	accessToken?: string;

	/**
	 * The API_ACCESS_TOKEN to authenticate, specify with `--api-token` or `--api-key` flag
	 */
	apiToken?: string;

	isDebugging?: boolean;
}

export const showProfile = async (options: InputOptions) => {
	const { buildServerUrl, currentUser, apiToken } = getCliConfig();
	if (!buildServerUrl || !currentUser || !currentUser.token?.access_token) return logError(`Unauthenticated.`);

	const { status, data } = await fetchApi({ url: `/auth/profile`, access_token: currentUser.token.access_token, api_key: apiToken });
	if (status === 0 || !data) return logError(`Authentication failed, invalid "access_token".`);

	const user = data as IUser;
	const ws = user.activeWorkspace as IWorkspace;
	const role = user.activeRole as IRole;

	const table = new Table();

	table.push(["Name", user.name]);
	table.push(["Username", user.slug]);
	table.push(["Email", user.email]);
	table.push(["Workspace", `${ws.name} (${ws.slug})`]);
	table.push(["Role", `${role.name} (${role.type})`]);

	console.log(table.toString());
};

export const cliLogin = async (options: CliLoginOptions) => {
	const { secondAction, url, accessToken, apiToken } = options;

	const { buildServerUrl: currentServerUrl } = getCliConfig();

	let access_token = accessToken;

	let buildServerUrl = url ?? secondAction ?? currentServerUrl ?? Config.DEFAULT_DX_SERVER_URL;
	if (!buildServerUrl) {
		logError(`Please provide your build server URL: "dx login <workspace_url>" or "dx login --help". Eg. https://build.example.com`);
		return;
	}

	const tokenDisplayUrl = `${buildServerUrl}/cli`;
	const cliConfig = saveCliConfig({
		buildServerUrl: trimEnd(buildServerUrl.indexOf(":3000") > -1 ? buildServerUrl.replace(/3000/, "6969") : buildServerUrl, "/"),
	});

	// open login page of build server:
	if (!access_token && !apiToken) {
		open(tokenDisplayUrl);

		const { inputAccessToken } = await inquirer.prompt<{ inputAccessToken: string }>([
			{
				type: "password",
				name: "inputAccessToken",
				message: "Enter your access token:",
				validate: function (value) {
					if (value.length) {
						return true;
					} else {
						return `Access token is required.`;
					}
				},
			},
		]);
		access_token = inputAccessToken;
	}

	let currentUser: IUser;

	// validate the "access_token" -> get "userId":
	const { status, data } = await fetchApi({ url: `/auth/profile`, access_token, api_key: apiToken });
	if (status === 0) {
		logError(`Authentication failed, invalid "access_token".`);
		return;
	}
	currentUser = data as IUser;
	if (options.isDebugging) console.log("currentUser :>> ", currentUser);

	// "access_token" is VALID -> save it to local machine!
	saveCliConfig({
		access_token,
		refresh_token: currentUser.token.refresh_token,
		apiToken,
		currentWorkspace: currentUser.activeWorkspace as IWorkspace,
	});

	const { workspaces = [], activeWorkspace } = currentUser;
	let currentWorkspace;

	// If no workspace existed, throw error! (because workspace creation flow is on the admin UI)
	if (workspaces.length < 1) {
		logError(
			`This account isn't integrated with any workspaces. Select or create one here: ${buildServerUrl}/workspace/select?redirect_url=${buildServerUrl}/cli`
		);
		return;
	}

	currentWorkspace = activeWorkspace;
	if (options.isDebugging) console.log("currentWorkspace :>> ", currentWorkspace);

	if (!currentUser.token) currentUser.token = {} as AccessTokenInfo;
	currentUser.token.access_token = access_token;

	// save this user & workspace to CLI config
	saveCliConfig({ currentUser, currentWorkspace });

	logSuccess(`Hello, ${currentUser.name}! You're logged into "${currentWorkspace.name}" workspace.`);

	return currentUser;
};

export const cliLogout = async () => {
	saveCliConfig({
		access_token: null,
		refresh_token: null,
		apiToken: null,
		currentUser: null,
		currentWorkspace: null,
		github_access_token: null,
	});

	return logSuccess(`You're logged out.`);
};

export async function cliAuthenticate(options: InputOptions) {
	let accessToken, workspace: IWorkspace, user: IUser;
	const { access_token: currentAccessToken, apiToken, buildServerUrl } = getCliConfig();
	accessToken = currentAccessToken;
	// workspace = currentWorkspace;

	const continueToLoginStep = async (url) => {
		options.url = url;
		const _user = await cliLogin(options);

		if (!_user) {
			logError(`Failed to login: User not found.`);
			return;
		}

		if (_user.token?.access_token) accessToken = _user.token.access_token;

		return _user;
	};

	if (!accessToken && !apiToken && buildServerUrl) {
		user = await continueToLoginStep(buildServerUrl);
		if (!user) return;
	}

	const {
		status,
		data: userData,
		messages,
	} = await fetchApi({
		url: `/auth/profile`,
		access_token: accessToken,
		api_key: apiToken,
	});
	user = userData as IUser;

	if (options.isDebugging) console.log("[ACCOUNT] user :>> ", user);

	if (!status || isEmpty(user) || isEmpty(user?.activeWorkspace)) {
		// don't give up, keep trying...
		if (buildServerUrl) user = await continueToLoginStep(buildServerUrl);
	}

	// Assign user & workspace to use across all CLI commands
	options.userId = MongoDB.toString(user._id);
	options.username = user.username ?? user.slug;
	options.workspace = user.activeWorkspace as IWorkspace;
	options.workspaceId = MongoDB.toString(options.workspace._id);

	// Save "currentUser", "access_token", "refresh_token" for next API requests
	saveCliConfig({
		currentUser: user,
		currentWorkspace: options.workspace,
		access_token: user.token.access_token,
		refresh_token: user.token.refresh_token,
	});

	return user;
}

export default { cliLogin, cliLogout, cliAuthenticate };
