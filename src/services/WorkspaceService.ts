import Workspace from "@/entities/Workspace";

import BaseService from "./BaseService";

export default class WorkspaceService extends BaseService<Workspace> {
	constructor() {
		super(Workspace);
	}
}

export { WorkspaceService };
