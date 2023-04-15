import type { IFramework } from "@/entities/Framework";
import { frameworkSchema } from "@/entities/Framework";

import BaseService from "./BaseService";

export default class FrameworkService extends BaseService<IFramework> {
	constructor() {
		super(frameworkSchema);
	}
}
export { FrameworkService };
