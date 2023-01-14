import User from "@/entities/User";
import type { ObjectID } from "@/libs/typeorm";

import BaseService from "./BaseService";
import WorkspaceService from "./WorkspaceService";

export default class UserService extends BaseService<User> {
	constructor() {
		super(User);
	}

	async create(data: User & { slug?: string; metadata?: any }) {
		if (!data.username) data.username = data.slug;
		return super.create(data);
	}

	// async update(filter: IQueryFilter, data: ObjectLiteral) {
	// 	if (!data.username) data.username = data.slug;
	// 	return super.update(filter, data);
	// }

	async joinWorkspace(userId: ObjectID, workspaceSlug: string) {
		if (!userId) throw new Error(`"userId" is required.`);
		if (!workspaceSlug) throw new Error(`"workspaceSlug" is required.`);
		// console.log("userId, workspaceSlug :>> ", userId, workspaceSlug);

		const workspaceSvc = new WorkspaceService();
		const workspace = await workspaceSvc.findOne({ slug: workspaceSlug });

		if (!workspace) throw new Error(`Workspace "${workspaceSlug}" not found.`);
		// console.log("workspace :>> ", workspace);

		const wsId = workspace._id as ObjectID;
		const user = await this.findOne({ id: userId });
		// console.log("user :>> ", user);

		// validations
		if (!user) throw new Error(`User not found.`);
		if (!workspace.public) throw new Error(`This workspace is private, you need to ask the administrator to add you in first.`);

		let updatedUser = [user];

		const isUserJoinedThisWorkspace = (user.workspaces as ObjectID[]).map((id) => id.toString()).includes(wsId.toString());
		// console.log("isUserJoinedThisWorkspace :>> ", isUserJoinedThisWorkspace);

		const isWorkspaceActive = user.activeWorkspace.toString() === wsId.toString();
		// console.log("isWorkspaceActive :>> ", isWorkspaceActive);

		if (!isUserJoinedThisWorkspace) updatedUser = await this.update({ id: userId }, { $push: { workspaces: wsId } });

		// make this workspace active
		if (!isWorkspaceActive) updatedUser = await this.update({ id: userId }, { activeWorkspace: wsId });

		// console.log("updatedUser :>> ", updatedUser[0]);

		return updatedUser[0];
	}
}

export { UserService };
