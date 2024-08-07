import { IUser, UserDto, IWorkspace, WorkspaceDto, IRole } from "../src/entities";
import { wait, waitUntil } from "@/plugins/utils";
import AppDatabase from "../src/modules/AppDatabase";
import { extractAccessTokenInfo, generateJWT } from "../src/modules/passports/jwtStrategy";
import { isServerReady, server, socketIO } from "../src/server";
import jwt from "jsonwebtoken";

import AppController from "../src/controllers/AppController";
import BuildController from "../src/controllers/BuildController";
import CloudDatabaseController from "../src/controllers/CloudDatabaseController";
import CloudProviderController from "../src/controllers/CloudProviderController";
import ClusterController from "../src/controllers/ClusterController";
import CronjobController from "../src/controllers/CronjobController";
import ContainerRegistryController from "../src/controllers/ContainerRegistryController";
import FrameworkController from "../src/controllers/FrameworkController";
import GitProviderController from "../src/controllers/GitProviderController";
import ProjectController from "../src/controllers/ProjectController";
import ReleaseController from "../src/controllers/ReleaseController";
import RoleController from "../src/controllers/RoleController";
import TeamController from "../src/controllers/TeamController";
import UserController from "../src/controllers/UserController";
import ApiKeyUserController from "../src/controllers/ApiKeyUserController";
import ServiceAccountController from "../src/controllers/ServiceAccountController";
import WorkspaceController from "../src/controllers/WorkspaceController";
import WebhookController from "../src/controllers/WebhookController";
import NotificationController from "../src/controllers/NotificationController";

import { isEmpty } from "lodash";
import { MongoDB } from "../src/plugins/mongodb";
import mongoose from "mongoose";
import chalk from "chalk";
import { Config } from "../src/app.config";
import { randomInt } from "crypto";
import { makeSlug } from "../src/plugins/slug";
import { AppRequest } from "@/interfaces/SystemTypes";
import { Options, execaCommand } from "execa";
import { CLI_CONFIG_DIR } from "@/config/const";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import CloudDatabaseBackupController from "@/controllers/CloudDatabaseBackupController";
import { DeployEnvironmentService } from "@/services";
import { fetchApi } from "@/modules/api";

const user1 = { name: "Test User 1", email: "user1@test.local" } as IUser;
const user2 = { name: "Test User 2", email: "user2@test.local" } as IUser;

// for API testing...
export const providerCtl = new CloudProviderController();
export const roleCtl = new RoleController();
export const teamCtl = new TeamController();
export const userCtl = new UserController();
export const apiKeyCtl = new ApiKeyUserController();
export const serviceAccountCtl = new ServiceAccountController();
export const workspaceCtl = new WorkspaceController();
export const projectCtl = new ProjectController();
export const appCtl = new AppController();
export const buildCtl = new BuildController();
export const releaseCtl = new ReleaseController();
export const databaseCtl = new CloudDatabaseController();
export const databaseBackupCtl = new CloudDatabaseBackupController();
export const clusterCtl = new ClusterController();
export const cronjobCtl = new CronjobController();
export const registryCtl = new ContainerRegistryController();
export const frameworkCtl = new FrameworkController();
export const gitCtl = new GitProviderController();
export const notificationCtl = new NotificationController();
export const webhookCtl = new WebhookController();

// for directly interact with the database...
export const providerSvc = providerCtl.service;
export const roleSvc = roleCtl.service;
export const teamSvc = teamCtl.service;
export const userSvc = userCtl.service;
export const apiKeySvc = apiKeyCtl.service;
export const serviceAccountSvc = serviceAccountCtl.service;
export const workspaceSvc = workspaceCtl.service;
export const projectSvc = projectCtl.service;
export const appSvc = appCtl.service;
export const buildSvc = buildCtl.service;
export const releaseSvc = releaseCtl.service;
export const databaseSvc = databaseCtl.service;
export const databaseBackupSvc = databaseBackupCtl.service;
export const clusterSvc = clusterCtl.service;
export const cronjobSvc = cronjobCtl.service;
export const registrySvc = registryCtl.service;
export const frameworkSvc = frameworkCtl.service;
export const gitSvc = gitCtl.service;
export const webhookSvc = webhookCtl.service;
export const notificationSvc = notificationCtl.service;
export const deployEnvSvc = new DeployEnvironmentService();

export const controllers = [
	roleCtl,
	teamCtl,
	userCtl,
	apiKeyCtl,
	serviceAccountCtl,
	workspaceCtl,
	projectCtl,
	appCtl,
	buildCtl,
	releaseCtl,
	databaseCtl,
	providerCtl,
	clusterCtl,
	cronjobCtl,
	registryCtl,
	frameworkCtl,
	gitCtl,
	webhookCtl,
	notificationCtl,
];

// current logged in user
export let currentUser: IUser;
export let currentWorkspace: IWorkspace;

const dbName = Config.DB_NAME;

export async function setupStartTestEnvironment() {
	// drop the test database
	try {
		const dropDbResult = await mongoose.connection.db.dropDatabase({ dbName });
		const dropMessage = dropDbResult ? `Database "${dbName}" was dropped.` : `Unable to drop database "${dbName}".`;
		console.log(chalk.red(dropMessage));
	} catch (e) {}

	// wait until the server is completely READY...
	await waitUntil(() => isServerReady === true, 1, 2 * 60);
}

export async function setupEndTestEnvironment() {
	// drop the test database
	const dropDbResult = await mongoose.connection.db.dropDatabase({ dbName });
	const dropMessage = dropDbResult ? `Database "${dbName}" was dropped.` : `Unable to drop database "${dbName}".`;
	console.log(chalk.red(dropMessage));

	// disconnect the database, socket & server
	await AppDatabase.disconnect();
	await socketIO.close();
	await server.close();
}

export const createUser = async (data: UserDto) => {
	const user = await userSvc.create(data);
	return user as IUser;
};

export const createFakeUser = async (
	id: number = randomInt(1000000),
	options: { method: "jwt" | "basic"; email?: string; workspace?: string } = { method: "jwt" }
) => {
	const { method = "jwt", email, workspace } = options;

	const name = `Fake User ${id}`;
	const userDto: UserDto = {
		name,
		email: email || `${makeSlug(name)}@test.user`,
	};

	if (method === "jwt") {
		return createUser(userDto);
	} else {
		const response = await fetchApi({
			url: "/api/v1/register",
			method: "POST",
			data: {
				email: `${makeSlug(name)}@test.user`,
				password: "123456",
				workspace,
			},
		});
		return response.data.user as IUser;
	}
};

export const getCurrentUser = async () => {
	// reload user data
	if (currentUser) currentUser = await userSvc.findOne({ _id: currentUser._id }, { populate: ["activeWorkspace", "activeRole", "roles"] });
	if (currentUser.activeWorkspace) currentWorkspace = currentUser.activeWorkspace as IWorkspace;
	return currentUser as IUser & { activeWorkspace: IWorkspace & { _id: string } };
};

export const createWorkspace = async (ownerId: string, name: string, isPublic = true, options?: { isDebugging?: boolean }) => {
	workspaceCtl.user = workspaceSvc.user = currentUser;

	const workspace = await workspaceSvc.create(
		{
			name,
			owner: ownerId,
			// hobby
			// dx_key: "0fc5c0bac0647eabb70f955f7ec03332c13b0170d1ce0984184700a85c0e2007",
			// self-hosted
			dx_key: "0e84fbcad09d9a4b7e0ec3af75607c4a9a400e84b1f4004dcc8d8807032a0320",
			public: isPublic,
		},
		options
	);
	console.log("[TEST] createWorkspace() workspace :>> ", workspace);
	// const workspace = workspaceRes.data as IWorkspace;

	// reload current user
	const user = await getCurrentUser();

	// assign user & workspace to controllers:
	controllers.map((ctl) => {
		ctl.user = currentUser;
		ctl.workspace = workspace;
		ctl.ownership = { owner: user, workspace };
		ctl.service.ownership = ctl.ownership;
		ctl.service.req = { user, workspace } as AppRequest;
		// special case (service that has no controllers)
		deployEnvSvc.ownership = ctl.ownership;
	});

	return workspace;
};

export const loginUser = async (userId: string, workspaceId?: string) => {
	const { accessToken: access_token, refreshToken: refresh_token } = generateJWT(userId, {
		expiresIn: process.env.JWT_EXPIRE_TIME || "2d",
		workspaceId: workspaceId,
	});

	const payload = jwt.decode(access_token, { json: true });
	const tokenInfo = await extractAccessTokenInfo({ access_token, refresh_token }, { id: userId, workspaceId, exp: payload?.exp || 10000 });

	let user: IUser = await userSvc.findOne({ _id: userId }, { populate: ["roles", "activeRole", "workspaces", "activeWorkspace"] });

	const updateData = {} as any;
	updateData.token = tokenInfo.token;
	updateData.activeWorkspace = workspaceId;

	// set active workspace to this user:
	const userWorkspaces = user.workspaces ? user.workspaces : [];
	if (workspaceId && !userWorkspaces.includes(workspaceId)) updateData.workspaces = [...userWorkspaces, workspaceId];

	// set default roles if this user doesn't have one
	if (workspaceId) {
		let userRoles = user.roles.filter((role) => MongoDB.toString((role as IRole).workspace) === workspaceId);
		if (workspaceId && isEmpty(userRoles)) {
			const memberRole = await roleSvc.findOne({ type: "member", workspace: workspaceId });
			updateData.roles = [memberRole._id];
			userRoles = [memberRole];
		}
		updateData.activeRole = (userRoles[0] as IRole)._id;
	}

	// update token to db:
	user = await userSvc.updateOne({ _id: userId }, updateData, { populate: ["roles", "activeRole", "workspaces", "activeWorkspace"] });

	const workspace: IWorkspace = workspaceId ? await workspaceSvc.findOne({ _id: workspaceId }) : undefined;

	// assign user & workspace to controllers:
	controllers.map((ctl) => {
		ctl.user = user;
		ctl.workspace = workspace;
		ctl.ownership = { owner: user, workspace };
		ctl.service.ownership = ctl.ownership;
		ctl.service.user = user;
		ctl.service.workspace = workspace;
		ctl.service.req = { user, workspace } as AppRequest;
		// special case (service that has no controllers)
		deployEnvSvc.ownership = ctl.ownership;
	});

	currentUser = user;
	currentWorkspace = workspace;

	return { user, workspace };
};

export type DxOptions = { onProgress?: (msg: string) => void; isDebugging?: boolean; cwd?: string };

export const CLI_TEST_DIR = path.resolve(CLI_CONFIG_DIR, "tests");
if (!existsSync(CLI_TEST_DIR)) mkdirSync(CLI_TEST_DIR, { recursive: true });
const dxCommandOptions: Options = { env: { CLI_MODE: "client" }, cwd: CLI_TEST_DIR };

export const dxCmd = async (command: string, options?: DxOptions) => {
	const _options = { ...dxCommandOptions };
	if (options?.cwd) _options.cwd = options.cwd;

	const stream = execaCommand(command, _options);
	let stdout: string = "";
	stream.stdio.forEach((_stdio) => {
		if (_stdio) {
			_stdio.on("data", (data) => {
				let logMsg = data.toString();
				stdout += logMsg;
				console.log(logMsg);
				if (options?.onProgress && logMsg) options?.onProgress(logMsg);
			});
		}
	});
	const end = await stream;
	const result = stdout || end.stdout;
	// console.log(result);
	return result;
};

/**
 * Closes testing connections if they are connected.
 */
// export function closeTestingConnections(connections: DataSource[]) {
// 	return Promise.all(connections.map((connection) => (connection && connection.isInitialized ? connection.close() : undefined)));
// }

/**
 * Reloads all databases for all given connections.
 */
// export function reloadTestingDatabases(connections: DataSource[]) {
// 	return Promise.all(connections.map((connection) => connection.synchronize(true)));
// }
