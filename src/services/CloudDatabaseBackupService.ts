import { Config } from "@/app.config";
import type { CloudDatabaseBackupDto, ICloudDatabaseBackup } from "@/entities/CloudDatabaseBackup";
import { cloudDatabaseBackupSchema } from "@/entities/CloudDatabaseBackup";
import type { BackupStatus, Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class CloudDatabaseBackupService extends BaseService<ICloudDatabaseBackup> {
	constructor(ownership?: Ownership) {
		super(cloudDatabaseBackupSchema, ownership);
	}

	create(data: CloudDatabaseBackupDto & { owner?: string; workspace?: string }): Promise<ICloudDatabaseBackup> {
		return super.create(data);
	}

	async updateStatus(id: any, data: { status: BackupStatus; path?: string }) {
		const url = `${Config.BASE_URL}/storage/${data.path.split("storage/")[1]}`;
		const backup = await this.updateOne({ _id: id }, { status: "success", path: data.path, url });
		return backup;
	}
}
