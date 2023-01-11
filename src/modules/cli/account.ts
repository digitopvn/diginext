import { logError, logSuccess } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty, trimEnd } from "lodash";
import open from "open";

import { getCliConfig, saveCliConfig } from "@/config/config";
import type User from "@/entities/User";
import type Workspace from "@/entities/Workspace";
import type InputOptions from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";

export const cliLogin = async (options: InputOptions) => {
	const { secondAction, url } = options;

	const buildServerUrl = url ?? secondAction;
	if (!buildServerUrl) {
		logError(`Please provide your build server URL: "di login <workspace_url>" or "di login --help". Eg. https://build.example.com`);
		return;
	}

	const cliConfig = saveCliConfig({ buildServerUrl: trimEnd(buildServerUrl, "/") });

	// open login page of build server:
	open(`${cliConfig.buildServerUrl}/auth/google?redirect_url=${cliConfig.buildServerUrl}/auth/profile`);

	const { access_token } = await inquirer.prompt([
		{
			type: "password",
			name: "access_token",
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
	saveCliConfig({ access_token });

	const { workspaces = [] } = currentUser;
	let currentWorkspace;
	// console.log({ workspaces });

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
		const { data: newWorkspace, messages: wsMsgs } = await fetchApi<Workspace>({
			url: `/api/v1/workspace`,
			method: "POST",
			data: { name: workspaceName, owner: currentUser._id },
		});

		if (isEmpty(newWorkspace)) {
			logError(`Can't create a workspace.`, wsMsgs.join(". "));
			return;
		}

		currentWorkspace = newWorkspace as Workspace;

		// update workspaceId to this user:
		const { data: updatedUser, messages: updateUserMsgs } = await fetchApi<User>({
			url: `/api/v1/user`,
			method: "PATCH",
			data: { "workspaces[]": currentWorkspace._id },
		});

		if (isEmpty(updatedUser)) {
			logError(updateUserMsgs.join(". "));
			return;
		}

		// TODO: seed default data: frameworks, git ?

		currentUser = updatedUser[0];
	} else if (workspaces.length > 1) {
		// if this user is already has a few workspaces, let them select one:
		const { workspace } = await inquirer.prompt([
			{
				type: "list",
				name: "workspace",
				message: "Select your workspace:",
				choices: workspaces.map((w) => {
					return { name: `${w.name} (${w.slug})`, value: w };
				}),
			},
		]);

		currentWorkspace = workspace;
	} else {
		// This user has only 1 workspace, select it !
		currentWorkspace = workspaces[0];
	}

	// console.log({ currentWorkspace, currentUser });

	if (!currentUser.token) currentUser.token = {};
	currentUser.token.access_token = access_token;

	// save this user & workspace to CLI config
	saveCliConfig({ currentWorkspace, currentUser });

	logSuccess(`Congrats, ${currentUser.name}! You're logged into "${currentWorkspace.name}" workspace.`);

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
	const { currentWorkspace, access_token: currentAccessToken, buildServerUrl } = getCliConfig();
	accessToken = currentAccessToken;
	workspace = currentWorkspace;
	// if (isEmpty(access_token) || isEmpty(currentWorkspace) || isEmpty(currentUser)) return logError(`Please login first: "di login <workspace_url>"`);

	const continueToLoginStep = async (url) => {
		options.url = url;
		const user = await cliLogin(options);

		if (!user) {
			logError(`Can't login to the build server...`);
			return;
		}

		if (user.token?.access_token) accessToken = user.token.access_token;

		return user;
	};

	if (isEmpty(accessToken) && buildServerUrl) {
		const user = await continueToLoginStep(buildServerUrl);
		if (!user) return;
		workspace = getCliConfig().currentWorkspace;
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
		logError(`Authentication failed.`, messages);
		if (buildServerUrl) user = await continueToLoginStep(buildServerUrl);
	}

	// log({ user });
	// log(`user.token :>>`, user.token);
	if (user.token?.access_token) saveCliConfig({ access_token: user.token.access_token });

	// Assign user & workspace to use across all CLI commands
	options.userId = user._id.toString();
	options.username = user.username ?? user.slug;
	options.workspace = workspace;
	options.workspaceId = workspace._id.toString();
	// console.log("userProfile :>> ", userProfile);

	// Save "currentUser" & "access_token" for next API requests
	saveCliConfig({ currentUser: user });

	return user;
}

export default { cliLogin, cliLogout, cliAuthenticate };
