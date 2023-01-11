import WorkspaceService from "@/services/WorkspaceService";

import BaseController from "./BaseController";

export default class WorkspaceController extends BaseController<WorkspaceService> {
	constructor() {
		super(new WorkspaceService());
	}
}
