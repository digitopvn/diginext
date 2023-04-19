import type { ICloudDatabase } from "@/entities/CloudDatabase";
import { cloudDatabaseSchema } from "@/entities/CloudDatabase";

import BaseService from "./BaseService";

export default class CloudDatabaseService extends BaseService<ICloudDatabase> {
	constructor() {
		super(cloudDatabaseSchema);
	}
}

export { ICloudDatabase as CloudDatabase };
