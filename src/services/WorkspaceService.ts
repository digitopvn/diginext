import { ObjectId } from "mongodb";

import Workspace from "@/entities/Workspace";

import BaseService from "./BaseService";
import UserService from "./UserService";

export default class WorkspaceService extends BaseService<Workspace> {
	constructor() {
		super(Workspace);
	}

	async create(data: Workspace & { slug?: string; metadata?: any }): Promise<(Workspace & { slug?: string; metadata?: any }) | { error: any }> {
		const { owner } = this.req.body;

		const newWorkspace = await super.create(data);

		if (owner) {
			const userSvc = new UserService();
			await userSvc.update({ id: owner }, { $push: { workspace: (newWorkspace as Workspace)._id } });
		} else {
			throw new Error(`Params "owner" is required.`);
		}

		return newWorkspace;
	}

	async addUser(userId: string | ObjectId, workspaceId: string | ObjectId) {
		const uid = new ObjectId(userId);
		const wsId = new ObjectId(workspaceId);
		const userSvc = new UserService();

		const user = await userSvc.findOne({ id: uid });
		const workspace = await this.findOne({ id: wsId });

		if (!user) throw new Error(`This user is not existed.`);
		if (!workspace) throw new Error(`This workspace is not existed.`);
		if ((user.workspaces as ObjectId[]).includes(wsId)) throw new Error(`This user is existed in this workspace.`);

		const updatedUser = await userSvc.update({ id: uid }, { $push: { workspace: wsId } });
		return updatedUser;
	}
}

export { WorkspaceService };
