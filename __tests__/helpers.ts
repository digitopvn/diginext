import { IUser, UserDto, IWorkspace, WorkspaceDto, IRole } from "../src/entities";
import fetchApi from "../src/modules/api/fetchApi";
import { wait, waitUntil } from "../src/plugins/utils";
import AppDatabase from "../src/modules/AppDatabase";
import { extractAccessTokenInfo, generateJWT } from "../src/modules/passports/jwtStrategy";
import { isServerReady, server, socketIO } from "../src/server";
import jwt from "jsonwebtoken";

import {
	ApiKeyUserService,
	AppService,
	BuildService,
	CloudDatabaseService,
	CloudDatabaseBackupService,
	CloudProviderService,
	ClusterService,
	ContainerRegistryService,
	CronjobService,
	FrameworkService,
	GitProviderService,
	ProjectService,
	ReleaseService,
	RoleService,
	ServiceAccountService,
	TeamService,
	UserService,
	WorkspaceService,
} from "../src/services";

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

import { isEmpty } from "lodash";
import { MongoDB } from "../src/plugins/mongodb";
import mongoose from "mongoose";
import chalk from "chalk";
import { Config } from "../src/app.config";

const user1 = { name: "Test User 1", email: "user1@test.local" } as IUser;
const user2 = { name: "Test User 2", email: "user2@test.local" } as IUser;

// for directly interact with the database...
export const appSvc = new AppService();
export const buildSvc = new BuildService();
export const databaseSvc = new CloudDatabaseService();
export const databaseBackupSvc = new CloudDatabaseBackupService();
export const providerSvc = new CloudProviderService();
export const clusterSvc = new ClusterService();
export const cronjobSvc = new CronjobService();
export const registrySvc = new ContainerRegistryService();
export const frameworkSvc = new FrameworkService();
export const gitSvc = new GitProviderService();
export const projectSvc = new ProjectService();
export const releaseSvc = new ReleaseService();
export const roleSvc = new RoleService();
export const teamSvc = new TeamService();
export const userSvc = new UserService();
export const apiKeySvc = new ApiKeyUserService();
export const serviceAccountSvc = new ServiceAccountService();
export const workspaceSvc = new WorkspaceService();

// for API testing...
export const appCtl = new AppController();
export const buildCtl = new BuildController();
export const databaseCtl = new CloudDatabaseController();
export const providerCtl = new CloudProviderController();
export const clusterCtl = new ClusterController();
export const cronjobCtl = new CronjobController();
export const registryCtl = new ContainerRegistryController();
export const frameworkCtl = new FrameworkController();
export const gitCtl = new GitProviderController();
export const projectCtl = new ProjectController();
export const releaseCtl = new ReleaseController();
export const roleCtl = new RoleController();
export const teamCtl = new TeamController();
export const userCtl = new UserController();
export const apiKeyCtl = new ApiKeyUserController();
export const serviceAccountCtl = new ServiceAccountController();
export const workspaceCtl = new WorkspaceController();

// current logged in user
export let currentUser: IUser;
export let currentWorkspace: IWorkspace;

const dbName = Config.DB_NAME;

export async function setupStartTestEnvironment() {
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

export const createWorkspace = async (name: string) => {
	if (!currentUser) throw new Error(`Unauthenticated.`);
	const ownerId = MongoDB.toString(currentUser._id);

	if (!ownerId) throw new Error(`createWorkspace > "ownerId" is not defined.`);

	const workspace = await workspaceCtl.create({
		name,
		owner: ownerId,
		// hobby
		// dx_key: "0fc5c0bac0647eabb70f955f7ec03332c13b0170d1ce0984184700a85c0e2007",
		// self-hosted
		dx_key: "0e84fbcad09d9a4b7e0ec3af75607c4a9a400e84b1f4004dcc8d8807032a0320",
	});

	currentUser = await userSvc.findOne({ _id: currentUser._id }, { populate: ["activeWorkspace", "workspaces", "roles"] });

	return workspace as IWorkspace;
};

export const loginUser = async (userId: string, workspaceId: string) => {
	const access_token = generateJWT(userId, {
		expiresIn: process.env.JWT_EXPIRE_TIME || "2d",
		workspaceId: workspaceId,
	});

	const payload = jwt.decode(access_token, { json: true });
	const tokenInfo = extractAccessTokenInfo(access_token, payload?.exp || 10000);

	let user: IUser = await userSvc.findOne({ _id: userId }, { populate: ["roles"] });

	const updateData = {} as any;
	updateData.token = tokenInfo.token;
	updateData.activeWorkspace = workspaceId;

	// set active workspace to this user:
	const userWorkspaces = user.workspaces ? user.workspaces : [];
	if (!userWorkspaces.includes(workspaceId)) updateData.workspaces = [...userWorkspaces, workspaceId];

	// set default roles if this user doesn't have one
	const userRoles = (user.roles || []).filter((role) => MongoDB.toString((role as IRole).workspace) === workspaceId);
	if (isEmpty(userRoles)) {
		const memberRole = await roleSvc.findOne({ name: "Member", workspace: workspaceId });
		updateData.roles = [memberRole._id];
	}

	[user] = await userSvc.update({ _id: userId }, updateData);

	const workspace: IWorkspace = await workspaceSvc.findOne({ _id: workspaceId });

	currentUser = user;
	currentWorkspace = workspace;

	return { user, workspace };
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