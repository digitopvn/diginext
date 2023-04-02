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

import { isEmpty } from "lodash";
import { ObjectId } from "mongodb";

const user1 = new User({ name: "Test User 1", email: "user1@test.local" });
const user2 = new User({ name: "Test User 2", email: "user2@test.local" });

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

export const createWorkspace = async (user: User, data: WorkspaceDto) => {
	const workspace = await workspaceSvc.create({ ...data, owner: user._id });
	return workspace as Workspace;
};

export const loginUser = async (userId: ObjectId, workspaceId: ObjectId) => {
	const access_token = generateJWT(userId.toString(), {
		expiresIn: process.env.JWT_EXPIRE_TIME || "2d",
		workspaceId: workspaceId.toString(),
	});

	const payload = jwt.decode(access_token, { json: true });
	const tokenInfo = extractAccessTokenInfo(access_token, payload?.exp || 10000);

	let user: User = await userSvc.findOne({ _id: userId }, { populate: ["roles"] });

	const updateData = {} as any;
	updateData.token = tokenInfo.token;
	updateData.activeWorkspace = new ObjectId(workspaceId);

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
