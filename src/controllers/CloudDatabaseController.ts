import CloudDatabaseService from "@/services/CloudDatabaseService";

import BaseController from "./BaseController";

export default class CloudDatabaseController extends BaseController<CloudDatabaseService> {
	constructor() {
		super(new CloudDatabaseService());
	}
}
