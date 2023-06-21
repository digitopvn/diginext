import type { CloudDatabaseBackupDto, ICloudDatabaseBackup } from "@/entities/CloudDatabaseBackup";
import { cloudDatabaseBackupSchema } from "@/entities/CloudDatabaseBackup";

import BaseService from "./BaseService";

export default class CloudDatabaseBackupService extends BaseService<ICloudDatabaseBackup> {
	constructor() {
		super(cloudDatabaseBackupSchema);
	}

	create(data: CloudDatabaseBackupDto): Promise<ICloudDatabaseBackup> {
		return super.create(data);
	}
}
