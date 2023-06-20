import type { ICloudDatabaseBackup } from "@/entities/CloudDatabaseBackup";
import { cloudDatabaseBackupSchema } from "@/entities/CloudDatabaseBackup";

import BaseService from "./BaseService";

export default class CloudDatabaseBackupService extends BaseService<ICloudDatabaseBackup> {
	constructor() {
		super(cloudDatabaseBackupSchema);
	}
}
