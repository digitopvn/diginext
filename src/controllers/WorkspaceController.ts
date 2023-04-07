import { isUndefined } from "lodash";
import { ObjectId } from "mongodb";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import BaseController from "@/controllers/BaseController";
import type { Role, User, Workspace } from "@/entities";
import type Base from "@/entities/Base";
import type { HiddenBodyKeys, ResponseData } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure, respondSuccess } from "@/interfaces";
import { ObjectID } from "@/libs/typeorm";
import { DB } from "@/modules/api/DB";
import { isValidObjectId, toObjectId } from "@/plugins/mongodb";
import { addUserToWorkspace, makeWorkspaceActive } from "@/plugins/user-utils";
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

		// [2] Ownership: add this workspace to the creator {User} if it's not existed:
		let user = await addUserToWorkspace(toObjectId(owner), newWorkspace);

		// set this workspace as "activeWorkspace" for this creator:
		user = await makeWorkspaceActive(toObjectId(owner), toObjectId(newWorkspace._id));

		/**
		 * SEED INITIAL DATA TO THIS WORKSPACE
		 * - Default roles
		 * - Default permissions of routes
		 * - Default API_KEY
		 * - Default Service Account
		 * - Default Frameworks
		 */
		await seedWorkspaceInitialData(newWorkspace, user);

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
