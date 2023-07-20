import type { IRole } from "@/entities/Role";
import { roleSchema } from "@/entities/Role";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class RoleService extends BaseService<IRole> {
	constructor(ownership?: Ownership) {
		super(roleSchema, ownership);
	}
}
