import type { IRole } from "@/entities/Role";
import { roleSchema } from "@/entities/Role";

import BaseService from "./BaseService";

export class RoleService extends BaseService<IRole> {
	constructor() {
		super(roleSchema);
	}
}
