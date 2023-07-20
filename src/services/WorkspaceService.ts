import type { IWorkspace } from "@/entities/Workspace";
import { workspaceSchema } from "@/entities/Workspace";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class WorkspaceService extends BaseService<IWorkspace> {
	constructor(ownership?: Ownership) {
		super(workspaceSchema, ownership);
	}
}
