import { log, logWarn } from "diginext-utils/dist/console/log";
import { isUndefined } from "lodash";
import { ObjectId } from "mongodb";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { DIGINEXT_DOMAIN } from "@/config/const";
import BaseController from "@/controllers/BaseController";
import type { Role, Workspace } from "@/entities";
import { User } from "@/entities";
import type Base from "@/entities/Base";
import type { HiddenBodyKeys, ResponseData } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import { ObjectID } from "@/libs/typeorm";
import { DB } from "@/modules/api/DB";
import { generateWorkspaceApiAccessToken, getUnexpiredAccessToken } from "@/plugins";
import { isValidObjectId } from "@/plugins/mongodb";
import seedWorkspaceInitialData from "@/seeds";
import { RoleService, UserService } from "@/services";
import WorkspaceService from "@/services/WorkspaceService";

interface AddUserBody {
	userId: string;
	workspaceId: string;
	roleId?: string;
}

interface ApiUserAndServiceAccountQueries extends IGetQueryParams {
	/**
	 * Workspace ID or slug
	 */
	workspace: string;
}

interface WorkspaceInputData extends Omit<Base, keyof HiddenBodyKeys> {
	/**
	 * Name of the workspace.
	 */
	name: string;
	/**
	 * User ID of the owner
	 */
	owner: string;
	/**
	 * Set privacy mode for this workspace
	 * @default true
	 */
	public?: boolean;
}

@Tags("Workspace")
@Route("workspace")
export default class WorkspaceController extends BaseController<Workspace> {
	// service: WorkspaceService;

	constructor() {
		super(new WorkspaceService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: WorkspaceInputData) {
		const { owner, name } = body;

		if (!name) return respondFailure({ msg: `Workspace "name" is required.` });
		if (!owner) return respondFailure({ msg: `Workspace "owner" (UserID) is required.` });

		// Assign some default values if it's missing
		if (isUndefined(body.public)) body.public = true;

		// [1] Create new workspace:
		const workspaceDto = { ...body } as any;
		const result = await super.create(workspaceDto);
		const { status = 0, messages } = result;
		if (!status) return respondFailure({ msg: messages.join(". ") });

		const newWorkspace = result.data as Workspace;
		const workspaceId = newWorkspace._id.toString();

		// [2] Ownership: add this workspace to the creator {User} if it's not existed:
		const user = await DB.findOne<User>("user", { id: owner });
		if (user) {
			if (!(user.workspaces || []).map((wsId) => wsId.toString()).includes(newWorkspace._id.toString())) {
				const workspaces = (user.workspaces || []).push(newWorkspace._id);
				await DB.update<User>("user", { _id: new ObjectId(owner) }, { workspaces });
			}
			// set this workspace as "activeWorkspace" for this creator:
			await DB.update<User>("user", { _id: new ObjectId(owner) }, { activeWorkspace: newWorkspace._id });
		} else {
			logWarn(`User "${owner}" is not existed.`);
		}

		// [2] Create "default" API access token user for this workspace:
		const apiKeyToken = generateWorkspaceApiAccessToken();

		const apiKeyUserDto = new User();
		apiKeyUserDto.type = "api_key";
		apiKeyUserDto.name = "Default API_KEY Account";
		apiKeyUserDto.email = `${apiKeyToken.name}@${newWorkspace.slug}.${DIGINEXT_DOMAIN}`;
		apiKeyUserDto.active = true;
		apiKeyUserDto.roles = [];
		apiKeyUserDto.workspaces = [newWorkspace._id];
		apiKeyUserDto.activeWorkspace = newWorkspace._id;
		apiKeyUserDto.token = getUnexpiredAccessToken(apiKeyToken.value);

		const apiKeyUser = await DB.create("user", apiKeyUserDto);
		if (apiKeyUser) log(`[WORKSPACE_CONTROLLER] Created "${apiKeyUser.name}" successfully.`);

		// [3] Create default service account for this workspace
		const serviceAccountToken = generateWorkspaceApiAccessToken();
		const serviceAccountDto: User = {
			type: "service_account",
			name: "Default Service Account",
			email: `default.${serviceAccountToken.name}@${newWorkspace.slug}.${DIGINEXT_DOMAIN}`,
			active: true,
			roles: [],
			workspaces: [workspaceId],
			activeWorkspace: workspaceId,
			token: getUnexpiredAccessToken(serviceAccountToken.value),
		};
		const serviceAccount = await DB.create<User>("user", serviceAccountDto);
		if (apiKeyUser) log(`[WORKSPACE_CONTROLLER] Created "${serviceAccount.name}" successfully.`);

		/**
		 * SEED INITIAL DATA TO THIS WORKSPACE
		 * - Default permissions of routes
		 * - Default roles
		 * ...
		 */
		await seedWorkspaceInitialData(workspaceId, owner);

		return { status: 1, data: newWorkspace, messages: [] } as ResponseData & { data: Workspace };
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: WorkspaceInputData, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/add-user")
	async addUser(@Body() data: AddUserBody) {
		const { userId, workspaceId, roleId } = data;
		const result: ResponseData & { data: User[] } = { status: 1, messages: [], data: [] };

		try {
			const uid = new ObjectID(userId);
			const wsId = new ObjectID(workspaceId);
			const userSvc = new UserService();
			const roleSvc = new RoleService();

			const user = await userSvc.findOne({ id: uid });
			const workspace = await this.service.findOne({ id: wsId });

			let role: Role;
			if (roleId) role = await roleSvc.findOne({ id: roleId });

			if (!user) throw new Error(`This user is not existed.`);
			if (!workspace) throw new Error(`This workspace is not existed.`);
			if ((user.workspaces as ObjectID[]).includes(wsId)) throw new Error(`This user is existed in this workspace.`);

			const workspaces = [...user.workspaces, wsId]
				.filter((_wsId) => typeof _wsId !== "undefined")
				.map((_wsId) => new ObjectID(_wsId.toString()));

			const updatedUser = await userSvc.update({ id: uid }, { workspaces });

			result.data = updatedUser;
		} catch (e) {
			result.messages.push(e.message);
			result.status = 0;
		}

		return result;
	}

	/**
	 * ======================= SERVICE ACCOUNT ======================
	 */

	/**
	 * Get Service Account list of a workspace
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/service_account")
	async getServiceAccounts(
		@Queries()
		queryParams?: ApiUserAndServiceAccountQueries
	) {
		const { workspace } = this.filter;
		if (!workspace) return respondFailure({ msg: `Workspace ID or slug is required.` });

		let serviceAccounts: User[] = [];
		if (isValidObjectId(workspace)) {
			serviceAccounts = await DB.find<User>("service_account", { workspaces: { $in: [new ObjectId(workspace)] } });
		} else {
			const ws = await DB.findOne<Workspace>("workspace", { slug: workspace });
			if (!ws) return respondFailure({ msg: `Workspace not found.` });
			serviceAccounts = await DB.find<User>("service_account", { workspaces: { $in: [ws._id] } });
		}

		return respondSuccess({ data: serviceAccounts });
	}

	/**
	 * ======================= API KEY USER ACCOUNT ======================
	 */

	/**
	 * Get Service Account list of a workspace
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/api_key")
	async getApiKeyUsers(
		@Queries()
		queryParams?: ApiUserAndServiceAccountQueries
	) {
		const { workspace } = this.filter;
		if (!workspace) return respondFailure({ msg: `Workspace ID or slug is required.` });

		let list: User[] = [];
		if (isValidObjectId(workspace)) {
			list = await DB.find<User>("api_key_user", { workspaces: { $in: [new ObjectId(workspace)] } });
		} else {
			const ws = await DB.findOne<Workspace>("workspace", { slug: workspace });
			if (!ws) return respondFailure({ msg: `Workspace not found.` });
			list = await DB.find<User>("api_key_user", { workspaces: { $in: [ws._id] } });
		}

		return respondSuccess({ data: list });
	}
}
