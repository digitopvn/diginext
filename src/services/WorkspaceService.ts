import type { IWorkspace } from "@/entities/Workspace";
import { workspaceSchema } from "@/entities/Workspace";

import BaseService from "./BaseService";

export default class WorkspaceService extends BaseService<IWorkspace> {
	constructor() {
		super(workspaceSchema);
	}
}

export { WorkspaceService };
