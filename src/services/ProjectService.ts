import Project from "@/entities/Project";

import BaseService from "./BaseService";

export default class ProjectService extends BaseService<Project> {
	constructor() {
		super(Project);
	}
}
export { ProjectService };
