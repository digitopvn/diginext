import type { ICloudDatabase } from "@/entities/CloudDatabase";
import CloudDatabase, { cloudDatabaseSchema } from "@/entities/CloudDatabase";

import BaseService from "./BaseService";

export default class CloudDatabaseService extends BaseService<ICloudDatabase> {
	constructor() {
		super(cloudDatabaseSchema);
	}
}

export { CloudDatabase };
