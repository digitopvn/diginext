import Framework from "@/entities/Framework";

import BaseService from "./BaseService";

export default class FrameworkService extends BaseService<Framework> {
	constructor() {
		super(Framework);
	}
}
export { FrameworkService };
