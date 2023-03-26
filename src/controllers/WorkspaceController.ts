import dayjs from "dayjs";
import { logWarn } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";
import { ObjectId } from "mongodb";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { DIGINEXT_DOMAIN } from "@/config/const";
import BaseController from "@/controllers/BaseController";
import type { Role, User, Workspace } from "@/entities";
import { WorkspaceApiAccessToken } from "@/entities";
import type Base from "@/entities/Base";
import type { HiddenBodyKeys, ResponseData } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams, respondFailure } from "@/interfaces";
import { ObjectID } from "@/libs/typeorm";
import { generateWorkspaceApiAccessToken } from "@/plugins";
import seedWorkspaceInitialData from "@/seeds";
import { RoleService, UserService } from "@/services";
import WorkspaceService from "@/services/WorkspaceService";

interface AddUserBody {
	userId: string;
	workspaceId: string;
	roleId?: string;
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
		if (!owner) return respondFailure({ msg: `Workspace "owner" is required.` });

		// default values
		if (isEmpty(body.public)) body.public = true;

		// default API access token
		const defaultApiAccessToken = new WorkspaceApiAccessToken();
		defaultApiAccessToken.name = "Default API access token";
		defaultApiAccessToken.token = generateWorkspaceApiAccessToken();
		defaultApiAccessToken.roles = [];

		const workspaceDto = { ...body } as any;
		workspaceDto.apiAccessTokens = [defaultApiAccessToken];

		// create new workspace:
		const result = await super.create(workspaceDto);
		const { status = 0, messages } = result;
		if (!status) return respondFailure({ msg: messages.join(". ") });

		const newWorkspace = result.data as Workspace;

		// add this workspace to that user:
		const userSvc = new UserService();
		const user = await userSvc.findOne({ id: owner });
		if (user) {
			const workspaces = [...user.workspaces, newWorkspace._id]
				.filter((wsId) => typeof wsId !== "undefined")
				.map((wsId) => new ObjectID(wsId.toString()));

			await userSvc.update({ _id: new ObjectId(owner) }, { workspaces });
		} else {
			logWarn(`User "${owner}" is not existed.`);
		}

		/**
		 * SEED INITIAL DATA
		 */
		const workspaceId = newWorkspace._id.toString();
		await seedWorkspaceInitialData(workspaceId, owner);

		// create default service account
		const serviceAccount = await userSvc.create({
			type: "service_account",
			name: "Default Service Account",
			email: `default@${newWorkspace.slug}.${DIGINEXT_DOMAIN}`,
			active: true,
			workspaces: [workspaceId],
			activeWorkspace: workspaceId,
			token: {
				access_token: generateWorkspaceApiAccessToken(),
				expiredDate: dayjs("2999-12-31").toDate(),
				expiredDateGTM7: dayjs("2999-12-31").format("YYYY-MM-DD HH:mm:ss"),
				expiredTimestamp: dayjs("2999-12-31").diff(dayjs()),
			},
		});

		// add this service account to this workspace:
		this.addUser({ userId: serviceAccount._id.toString(), workspaceId });

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
}
