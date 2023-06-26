import { IGitProvider, IRole, IWorkspace } from "@/entities";
import { MongoDB } from "../../src/plugins/mongodb";
import {
	apiKeySvc,
	createFakeUser,
	createWorkspace,
	getCurrentUser,
	gitCtl,
	gitSvc,
	loginUser,
	providerSvc,
	roleSvc,
	serviceAccountSvc,
	userSvc,
	workspaceSvc,
} from "../helpers";
import { IApiKeyAccount } from "@/entities/ApiKeyAccount";
import GitProviderAPI from "@/modules/git/git-provider-api";

export function testFlow1() {
	let wsId: string;

	it("Authenticate fake user #1 (admin)", async () => {
		// create user
		await createFakeUser(1);

		// query db
		const name = `Fake User 1`;
		let fakeUser1 = await userSvc.findOne({ name });
		expect(fakeUser1).toBeDefined();

		const userId = MongoDB.toString(fakeUser1._id);
		if (!userId) return;

		// first login (no workspace)
		const loginRes1 = await loginUser(userId);
		expect(loginRes1.user).toBeDefined();
		expect(loginRes1.user.token?.access_token).toBeDefined();
	});

	it("Workspace #1: Create workspace", async () => {
		// query db
		const name = `Fake User 1`;
		let fakeUser1 = await userSvc.findOne({ name });

		const userId = MongoDB.toString(fakeUser1._id);
		if (!userId) return;

		// create workspace
		const ws = await createWorkspace(userId, `First Workspace`);
		expect(ws).toBeDefined();

		wsId = MongoDB.toString(ws._id);
		if (!wsId) return;

		// reload fake user
		fakeUser1 = await userSvc.findOne({ name });

		expect(Array.isArray(fakeUser1.workspaces)).toBe(true);
		expect(fakeUser1.workspaces).toContain(wsId);

		// second login (has workspace)
		const loginRes = await loginUser(userId, wsId);
		expect(loginRes.user).toBeDefined();
		expect(loginRes.workspace).toBeDefined();
		expect(loginRes.user._id).toEqual(fakeUser1._id);
		expect(loginRes.workspace._id).toEqual(ws._id);
		expect(loginRes.user.token?.access_token).toBeDefined();
		expect(loginRes.user.activeWorkspace).toEqual(wsId);
	});

	it("Workspace #1: Initial data", async () => {
		// current authenticated user:
		let fakeUser1 = await getCurrentUser();
		expect((fakeUser1.activeRole as IRole).type).toEqual("admin");

		// current workspace
		wsId = fakeUser1.activeWorkspace._id;
		const ws = (await workspaceSvc.findOne({ _id: wsId })) as IWorkspace;
		expect(ws).toBeDefined();

		// check 3 initial roles
		const initialRoles = await roleSvc.find({ workspace: wsId });
		expect(initialRoles.length).toEqual(3);

		const roleNames = initialRoles.map((role) => (role as IRole).name);
		expect(roleNames).toContain("Administrator");
		expect(roleNames).toContain("Moderator");
		expect(roleNames).toContain("Member");

		// check default API key
		const apiKeys = await apiKeySvc.find({ workspaces: wsId }, { populate: ["roles"] });
		expect(apiKeys.length).toBeGreaterThan(0);

		const defaulApiKey = apiKeys[0];
		expect(defaulApiKey.roles.length).toBeGreaterThan(0);
		expect(defaulApiKey.roles.map((role) => (role as IRole).name)).toContain("Moderator");

		// check default service account
		const serviceAccounts = await serviceAccountSvc.find({ workspaces: wsId }, { populate: ["roles"] });
		expect(serviceAccounts.length).toBeGreaterThan(0);

		const defaulSvcAcc = apiKeys[0];
		expect(defaulSvcAcc.roles.length).toBeGreaterThan(0);
		expect(defaulSvcAcc.roles.map((role) => (role as IRole).name)).toContain("Moderator");
	});

	it("Workspace #1: Git Provider - Bitbucket", async () => {
		// seed git provider: bitbucket
		const createRes = await gitCtl.create({
			name: "Bitbucket",
			type: "bitbucket",
			gitWorkspace: process.env.TEST_BITBUCKET_ORG,
			repo: {
				url: `https://bitbucket.org/${process.env.TEST_BITBUCKET_ORG}`,
				sshPrefix: `git@bitbucket.org:${process.env.TEST_BITBUCKET_ORG}`,
			},
			bitbucket_oauth: {
				username: process.env.TEST_BITBUCKET_USERNAME,
				app_password: process.env.TEST_BITBUCKET_APP_PASS,
			},
		});

		// verify bitbucket api
		let bitbucket = createRes.data as IGitProvider;
		bitbucket = await gitSvc.verify(bitbucket);

		// check...
		expect(bitbucket.verified).toBe(true);
		expect(bitbucket.host).toBe("bitbucket.org");

		const profile = await GitProviderAPI.getProfile(bitbucket);
		expect(profile).toBeDefined();
		expect(profile.username).toBe(process.env.TEST_BITBUCKET_USERNAME);
	});

	it("Workspace #1: Git Provider - Github", async () => {
		//...
	});

	it("Workspace #1: Add member", async () => {
		// registerr fake user #2:
		let fakeUser2 = await createFakeUser(2);

		// login to workspace #1
		const loginRes = await loginUser(MongoDB.toString(fakeUser2._id), wsId);

		// reload user
		fakeUser2 = loginRes.user;
		expect((fakeUser2.activeRole as IRole).type).toEqual("member");

		// login back to fake user #1
	});
}
