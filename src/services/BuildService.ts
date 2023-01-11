import Build from "@/entities/Build";

import BaseService from "./BaseService";

export default class BuildService extends BaseService<Build> {
	constructor() {
		super(Build);
	}
}

export { BuildService };
