import type { IBuild } from "@/entities/Build";
import { buildSchema } from "@/entities/Build";

import BaseService from "./BaseService";

export default class BuildService extends BaseService<IBuild> {
	constructor() {
		super(buildSchema);
	}
}

export { BuildService };
