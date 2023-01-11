import CloudDatabase from "@/entities/CloudDatabase";

import BaseService from "./BaseService";

export default class CloudDatabaseService extends BaseService<CloudDatabase> {
	constructor() {
		super(CloudDatabase);
	}
}

export { CloudDatabase };
