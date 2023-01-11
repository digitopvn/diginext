import AppService from "@/services/AppService";

import BaseController from "./BaseController";

export default class AppController extends BaseController<AppService> {
	constructor() {
		super(new AppService());
	}
}
