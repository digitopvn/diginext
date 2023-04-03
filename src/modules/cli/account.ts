import { logError, logSuccess } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty, trimEnd } from "lodash";
import open from "open";

import { getCliConfig, saveCliConfig } from "@/config/config";
import type User from "@/entities/User";
import type { AccessTokenInfo } from "@/entities/User";
import type Workspace from "@/entities/Workspace";
import type InputOptions from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";

import { DB } from "../api/DB";

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
}

export const cliLogin = async (options: CliLoginOptions) => {
	const { secondAction, url, accessToken } = options;

	const { buildServerUrl: currentServerUrl } = getCliConfig();

	// console.log("cliLogin > accessToken :>> ", accessToken);

	let access_token = accessToken;

	let buildServerUrl = url ?? secondAction ?? currentServerUrl;
	if (!buildServerUrl) {
		logError(`Please provide your build server URL: "dx login <workspace_url>" or "dx login --help". Eg. https://build.example.com`);
		return;
	}

	const tokenDisplayUrl = `${buildServerUrl}/cli`;
	const cliConfig = saveCliConfig({
		buildServerUrl: trimEnd(buildServerUrl.indexOf(":3000") > -1 ? buildServerUrl.replace(/3000/, "6969") : buildServerUrl, "/"),
	});

	// open login page of build server:
	if (!access_token) open(tokenDisplayUrl);
	// open(`${cliConfig.buildServerUrl}/auth/google?redirect_url=${cliConfig.buildServerUrl}/auth/profile`);

	if (!access_token) {
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

	let currentUser: User;

	// validate the "access_token" -> get "userId":
	const { status, data } = await fetchApi<User>({ url: `/auth/profile`, access_token });
	if (status === 0) {
		logError(`Authentication failed, "access_token" is not valid.`);
		return;
	}
	currentUser = data as User;
	// const userId = currentUser._id;

	// "access_token" is VALID -> save it to local machine!
	saveCliConfig({ access_token, currentWorkspace: currentUser.activeWorkspace as Workspace });

	console.log(`[AUTH]`, { currentUser });
	const { workspaces = [], activeWorkspace } = currentUser;
	let currentWorkspace;
	console.log("workspaces :>> ", workspaces);
	// console.log(`[AUTH]`, { activeWorkspace });

	// If no workspace existed, create new here!
	if (workspaces.length < 1) {
		const { workspaceName } = await inquirer.prompt([
			{
				type: "input",
				name: "workspaceName",
				message: "Enter workspace's name to create:",
				validate: function (value) {
					if (value.length > 3) {
						return true;
					} else {
						return logError(`Workspace's name must contain more than 3 characters.`);
					}
				},
			},
		]);

		// create new workspace:
		const newWorkspace = await DB.create<Workspace>("workspace", { name: workspaceName, owner: currentUser._id });
		if (!newWorkspace) return;

		currentWorkspace = newWorkspace as Workspace;

		// update workspaceId to this user and set it as an active workspace:
		const [updatedUser] = await DB.update<User>(
			"user",
			{ _id: currentUser._id },
			{
				$set: { activeWorkspace: currentWorkspace._id },
				$addToSet: { workspaces: currentWorkspace._id },
			},
			{ populate: ["workspaces", "activeWorkspace"], raw: true }
		);

		if (!updatedUser) return;

		// TODO: seed default data: frameworks, git ?
		currentUser = updatedUser[0];
	} else {
		currentWorkspace = activeWorkspace;
	}

	if (!currentUser.token) currentUser.token = {} as AccessTokenInfo;
	currentUser.token.access_token = access_token;

	// save this user & workspace to CLI config
	saveCliConfig({ currentUser, currentWorkspace });

	// console.log("updatedUser :>> ", updatedUser[0]);
	// if (updatedUser) currentUser = updatedUser[0] as User;

	logSuccess(`Hello, ${currentUser.name}! You're logged into "${currentWorkspace.name}" workspace.`);

	return currentUser;
};

export const cliLogout = async () => {
	saveCliConfig({
		access_token: null,
		currentUser: null,
		currentWorkspace: null,
	});

	return logSuccess(`You're logged out.`);
};

export async function cliAuthenticate(options: InputOptions) {
	let accessToken, workspace: Workspace;
	const { access_token: currentAccessToken, buildServerUrl } = getCliConfig();
	accessToken = currentAccessToken;
	// workspace = currentWorkspace;

	const continueToLoginStep = async (url) => {
		options.url = url;
		const user = await cliLogin(options);

		if (!user) {
			logError(`Failed to login: User not found.`);
			return;
		}

		if (user.token?.access_token) accessToken = user.token.access_token;

		return user;
	};

	if (!accessToken && buildServerUrl) {
		const user = await continueToLoginStep(buildServerUrl);
		if (!user) return;
		// workspace = getCliConfig().currentWorkspace;
	}
	// if (isEmpty(currentWorkspace) && buildServerUrl) await continueToLoginStep(buildServerUrl);
	// if (isEmpty(currentUser) && buildServerUrl) await continueToLoginStep(buildServerUrl);

	const {
		status,
		data: userData,
		messages,
	} = await fetchApi<User>({
		url: `/auth/profile`,
		access_token: accessToken,
	});
	let user = userData as User;
	// log(`user :>>`, user);

	if (!status || isEmpty(user)) {
		// logError(`Authentication failed.`, messages);
		if (buildServerUrl) user = await continueToLoginStep(buildServerUrl);
	}

	// log({ user });
	// log(`user.token :>>`, user.token);
	if (user.token?.access_token) saveCliConfig({ access_token: user.token.access_token });

	// Assign user & workspace to use across all CLI commands
	options.userId = user._id.toString();
	options.username = user.username ?? user.slug;
	options.workspace = user.activeWorkspace as Workspace;
	options.workspaceId = options.workspace._id.toString();
	// console.log("userProfile :>> ", userProfile);

	// Save "currentUser" & "access_token" for next API requests
	saveCliConfig({ currentUser: user, currentWorkspace: options.workspace });

	return user;
}

export default { cliLogin, cliLogout, cliAuthenticate };
