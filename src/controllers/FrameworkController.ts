import FrameworkService from "@/services/FrameworkService";

import BaseController from "./BaseController";

export default class FrameworkController extends BaseController<FrameworkService> {
	constructor() {
		super(new FrameworkService());
	}
}
