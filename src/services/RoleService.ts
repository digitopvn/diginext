import Role from "@/entities/Role";

import BaseService from "./BaseService";

export default class RoleService extends BaseService<Role> {
	constructor() {
		super(Role);
	}
}

export { RoleService };
