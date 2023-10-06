import { existsSync } from "fs";
import { rm } from "fs/promises";

import { Config } from "@/app.config";
import type { CloudDatabaseBackupDto, ICloudDatabaseBackup } from "@/entities/CloudDatabaseBackup";
import { cloudDatabaseBackupSchema } from "@/entities/CloudDatabaseBackup";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";
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

	async delete(filter?: IQueryFilter<ICloudDatabaseBackup>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		const backup = await this.findOne(filter);
		if (backup) {
			try {
				const bkPath = backup.path;
				if (existsSync(bkPath)) rm(bkPath, { recursive: true, force: true });
			} catch (e) {
				console.error(`[DB_BK_SERVICE]`, e);
			}
		}
		return this.delete(filter, options);
	}

	async softDelete(filter?: IQueryFilter<ICloudDatabaseBackup>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		const backup = await this.findOne(filter);
		if (backup) {
			try {
				const bkPath = backup.path;
				if (existsSync(bkPath)) rm(bkPath, { recursive: true, force: true });
			} catch (e) {
				console.error(`[DB_BK_SERVICE]`, e);
			}
		}
		return this.softDelete(filter, options);
	}
}
