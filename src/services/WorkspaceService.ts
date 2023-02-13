import { ObjectId } from "mongodb";

import type { Role } from "@/entities";
import Workspace from "@/entities/Workspace";
import seedInitialData from "@/seeds";

import BaseService from "./BaseService";
import RoleService from "./RoleService";
import UserService from "./UserService";

export default class WorkspaceService extends BaseService<Workspace> {
	constructor() {
		super(Workspace);
	}

	async create(data: Workspace & { slug?: string; metadata?: any }): Promise<(Workspace & { slug?: string; metadata?: any }) | { error: any }> {
		const { owner } = this.req.body;

		const newWorkspace = (await super.create(data)) as Workspace;

		if (owner) {
			const userSvc = new UserService();
			await userSvc.update({ id: owner }, { $push: { workspace: newWorkspace._id } });
		} else {
			throw new Error(`Params "owner" is required.`);
		}

		/**
		 * SEED INITIAL DATA
		 */
		await seedInitialData(newWorkspace._id.toString(), owner);

		return newWorkspace;
	}

	async addUser(userId: string | ObjectId, workspaceId: string | ObjectId, roleId?: string | ObjectId) {
		const uid = new ObjectId(userId);
		const wsId = new ObjectId(workspaceId);
		const userSvc = new UserService();
		const roleSvc = new RoleService();

		const user = await userSvc.findOne({ id: uid });
		const workspace = await this.findOne({ id: wsId });

		let role: Role;
		if (roleId) {
			role = await roleSvc.findOne({ id: roleId });
		}

		if (!user) throw new Error(`This user is not existed.`);
		if (!workspace) throw new Error(`This workspace is not existed.`);
		if ((user.workspaces as ObjectId[]).includes(wsId)) throw new Error(`This user is existed in this workspace.`);

		const updatedUser = await userSvc.update({ id: uid }, { $push: { workspace: wsId } });
		return updatedUser;
	}
}

export { WorkspaceService };
