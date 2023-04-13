import { DataSource, ObjectID } from "../src/libs/typeorm";
import { User, UserDto, Workspace, WorkspaceDto } from "../src/entities";
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
	CloudProviderService,
	ClusterService,
	ContainerRegistryService,
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

const user1 = new User({ name: "Test User 1", email: "user1@test.local" });
const user2 = new User({ name: "Test User 2", email: "user2@test.local" });

// for directly interact with the database...
export const appSvc = new AppService();
export const buildSvc = new BuildService();
export const databaseSvc = new CloudDatabaseService();
export const providerSvc = new CloudProviderService();
export const clusterSvc = new ClusterService();
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
export let currentUser: User;
export let currentWorkspace: Workspace;

export function setupTestEnvironment() {
	beforeAll(async () => {
		// wait until the server is completely READY...
		await waitUntil(() => isServerReady === true, 1, 2 * 60);
	});

	afterAll(async () => {
		// wait 1m before tearing down Jest...
		await wait(10000);
		await AppDatabase.disconnect();
		await socketIO.close();
		await server.close();
	}, 15 * 1000);
}

export const createUser = async (data: UserDto) => {
	const user = await userSvc.create(data);
	return user as User;
};

export const createWorkspace = async (name: string) => {
	if (!currentUser) throw new Error(`Unauthenticated.`);

	const workspace = await workspaceCtl.create({
		name,
		owner: currentUser._id,
	});

	currentUser = await userSvc.findOne({ _id: currentUser._id }, { populate: ["activeWorkspace", "workspaces", "roles"] });

	return workspace as Workspace;
};

export const loginUser = async (userId: ObjectID, workspaceId: ObjectID) => {
	const access_token = generateJWT(userId.toString(), {
		expiresIn: process.env.JWT_EXPIRE_TIME || "2d",
		workspaceId: workspaceId.toString(),
	});

	const payload = jwt.decode(access_token, { json: true });
	const tokenInfo = extractAccessTokenInfo(access_token, payload?.exp || 10000);

	let user: User = await userSvc.findOne({ _id: userId }, { populate: ["roles"] });

	const updateData = {} as any;
	updateData.token = tokenInfo.token;
	updateData.activeWorkspace = workspaceId;

	// set active workspace to this user:
	const userWorkspaces = user.workspaces ? user.workspaces : [];
	if (!userWorkspaces.includes(workspaceId)) updateData.workspaces = [...userWorkspaces, workspaceId];

	// set default roles if this user doesn't have one
	const userRoles = (user.roles || []).filter((role) => role.workspace === workspaceId);
	if (isEmpty(userRoles)) {
		const memberRole = await roleSvc.findOne({ name: "Member", workspace: workspaceId });
		updateData.roles = [memberRole._id];
	}

	[user] = await userSvc.update({ _id: userId }, updateData);

	const workspace: Workspace = await workspaceSvc.findOne({ _id: workspaceId });

	currentUser = user;
	currentWorkspace = workspace;

	return { user, workspace };
};

/**
 * Closes testing connections if they are connected.
 */
export function closeTestingConnections(connections: DataSource[]) {
	return Promise.all(connections.map((connection) => (connection && connection.isInitialized ? connection.close() : undefined)));
}

/**
 * Reloads all databases for all given connections.
 */
export function reloadTestingDatabases(connections: DataSource[]) {
	return Promise.all(connections.map((connection) => connection.synchronize(true)));
}
