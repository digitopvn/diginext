import { ObjectId } from "mongodb";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import BaseController from "@/controllers/BaseController";
import type { Role, User, Workspace } from "@/entities";
import type { HiddenBodyKeys, ResponseData } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import seedInitialData from "@/seeds";
import { RoleService, UserService } from "@/services";
import WorkspaceService from "@/services/WorkspaceService";

interface AddUserBody {
	userId: string;
	workspaceId: string;
	roleId?: string;
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

	@Security("jwt")
	@Post("/")
	async create(@Body() body: Omit<Workspace, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		const { owner } = body;

		const newWorkspace = { ...body } as Workspace;

		if (owner) {
			const userSvc = new UserService();
			await userSvc.update({ id: owner }, { $push: { workspace: newWorkspace._id } }, { raw: true });
		} else {
			throw new Error(`Params "owner" is required.`);
		}

		/**
		 * SEED INITIAL DATA
		 */
		await seedInitialData(newWorkspace._id.toString(), owner.toString());

		return super.create(newWorkspace);
	}

	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<Workspace, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Security("jwt")
	@Patch("/add-user")
	async addUser(@Body() data: AddUserBody) {
		const { userId, workspaceId, roleId } = data;
		const result: ResponseData & { data: User[] } = { status: 1, messages: [], data: [] };

		try {
			// const users = await (this.service as WorkspaceService).addUser(userId as string, workspaceId as string);
			const uid = new ObjectId(userId);
			const wsId = new ObjectId(workspaceId);
			const userSvc = new UserService();
			const roleSvc = new RoleService();

			const user = await userSvc.findOne({ id: uid });
			const workspace = await this.service.findOne({ id: wsId });

			let role: Role;
			if (roleId) {
				role = await roleSvc.findOne({ id: roleId });
			}

			if (!user) throw new Error(`This user is not existed.`);
			if (!workspace) throw new Error(`This workspace is not existed.`);
			if ((user.workspaces as ObjectId[]).includes(wsId)) throw new Error(`This user is existed in this workspace.`);

			const updatedUser = await userSvc.update({ id: uid }, { $push: { workspace: wsId } });

			result.data = updatedUser;
		} catch (e) {
			result.messages.push(e.message);
			result.status = 0;
		}

		return result;
	}
}
