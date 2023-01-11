import RoleService from "@/services/RoleService";

import BaseController from "./BaseController";

export default class RoleController extends BaseController<RoleService> {
	constructor() {
		super(new RoleService());
	}
}
