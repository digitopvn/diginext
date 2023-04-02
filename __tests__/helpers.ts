import { User } from "../src/entities";
import fetchApi from "../src/modules/api/fetchApi";
import { wait, waitUntil } from "../src/plugins/utils";
import AppDatabase from "../src/modules/AppDatabase";
import { isServerReady, server, socketIO } from "../src/server";

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

const user1 = new User({ name: "Test User 1", email: "user1@test.local" });
const user2 = new User({ name: "Test User 2", email: "user2@test.local" });

const app = new AppService();
const build = new BuildService();
const database = new CloudDatabaseService();
const provider = new CloudProviderService();
const cluster = new ClusterService();
const registry = new ContainerRegistryService();
const framework = new FrameworkService();
const git = new GitProviderService();
const project = new ProjectService();
const release = new ReleaseService();
const role = new RoleService();
const team = new TeamService();
const user = new UserService();
const api_key_user = new ApiKeyUserService();
const service_account = new ServiceAccountService();
const workspace = new WorkspaceService();

export const SVC = {
	app,
	build,
	database,
	provider,
	cluster,
	registry,
	framework,
	git,
	project,
	release,
	role,
	team,
	user,
	api_key_user,
	service_account,
	workspace,
};

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

export const createUser = async (data: User) => {
	const user = await fetchApi<User>({ url: "/api/v1/user", method: "POST", data: data });
	return user;
};
