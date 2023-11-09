import { existsSync } from "fs";
import { rm } from "fs/promises";

import { Config } from "@/app.config";
import type { CloudDatabaseBackupDto, ICloudDatabaseBackup } from "@/entities/CloudDatabaseBackup";
import { cloudDatabaseBackupSchema } from "@/entities/CloudDatabaseBackup";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";
import type { BackupStatus, Ownership } from "@/interfaces/SystemTypes";
import { MongoDB } from "@/plugins/mongodb";

import BaseService from "./BaseService";
import { SystemLogService } from "./SystemLogService";
import { WorkspaceService } from "./WorkspaceService";

export class CloudDatabaseBackupService extends BaseService<ICloudDatabaseBackup> {
	constructor(ownership?: Ownership) {
		super(cloudDatabaseBackupSchema, ownership);
	}

	async create(data: CloudDatabaseBackupDto & { owner?: string; workspace?: string }): Promise<ICloudDatabaseBackup> {
		try {
			const backup = await super.create(data);
			console.log("CloudDatabaseBackupService > create > backup :>> ", backup);

			// check expired backups and deleted expired ones
			this.deleteExpiredBackups(MongoDB.toString(this.workspace._id));

			return backup;
		} catch (e) {
			const logSvc = new SystemLogService();
			await logSvc.saveError(e, {
				level: 3,
				name: "[DB_BK_SERVICE] Unable to create new database backup",
				type: "error",
				workspace: this.workspace,
			});
			return;
		}
	}

	async updateStatus(id: any, data: { status: BackupStatus; path?: string }) {
		const updateData: any = { status: data.status };
		if (data.path) {
			updateData.path = data.path;
			updateData.url = `${Config.BASE_URL}/storage/${data.path.split("storage/")[1]}`;
		}

		const backup = await this.updateOne({ _id: id }, updateData);
		return backup;
	}

	async delete(filter?: IQueryFilter<ICloudDatabaseBackup>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		const backups = await this.find(filter);
		if (backups) {
			try {
				backups.forEach((backup) => {
					const bkPath = backup.path;
					if (existsSync(bkPath)) rm(bkPath, { recursive: true, force: true });
				});
			} catch (e) {
				console.error(`[DB_BK_SERVICE]`, e);
				const logSvc = new SystemLogService();
				logSvc.saveError(e, { level: 3, name: "[DB_BK_SERVICE] Unable to delete database backup", type: "error", workspace: this.workspace });
			}
		}
		return super.delete(filter, options);
	}

	async softDelete(filter?: IQueryFilter<ICloudDatabaseBackup>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		const backups = await this.find(filter);
		if (backups) {
			try {
				backups.forEach((backup) => {
					const bkPath = backup.path;
					if (existsSync(bkPath)) rm(bkPath, { recursive: true, force: true });
				});
			} catch (e) {
				console.error(`[DB_BK_SERVICE]`, e);
				const logSvc = new SystemLogService();
				logSvc.saveError(e, { level: 3, name: "[DB_BK_SERVICE] Unable to delete database backup", type: "error", workspace: this.workspace });
			}
		}
		return super.softDelete(filter, options);
	}

	async deleteExpiredBackups(workspaceId: string) {
		console.log("[DB_BACKUP] deleteExpiredBackups > workspaceId :>> ", workspaceId);
		const workspaceSvc = new WorkspaceService();
		const workspace = await workspaceSvc.findOne({ _id: workspaceId });
		if (!workspace) throw new Error(`Unable to delete expired db backups of "${workspaceId}" workspace: Workspace not found.`);

		console.log("[DB_BACKUP] deleteExpiredBackups > workspace :>> ", workspace);

		const { type, value } = workspace.settings?.database_backup?.retention || {};
		if (!type && !value) return;

		console.log(`[DB_BACKUP] Deleting expired database backups...`);

		const now = new Date();
		if (type === "duration") {
			// Mark as deleted based on duration
			const thresholdDate = new Date(Date.now() - value);

			// Count backups that would be marked as deleted
			return this.model
				.countDocuments({
					createdAt: { $lt: thresholdDate },
					deletedAt: null,
				})
				.then(async (toDeleteCount) => {
					console.log(`${toDeleteCount} backups will be marked as deleted based on duration.`);

					// Now, perform the update if there are any backups to be marked as deleted
					if (toDeleteCount > 0) {
						return this.softDelete(
							{
								createdAt: { $lt: thresholdDate },
								deletedAt: null,
							},
							{
								$set: { deletedAt: new Date() },
							}
						);
					}
				})
				.catch((e) => {
					console.error(`Unable to delete expired DB backups (by DURATION):`, e);
					const logSvc = new SystemLogService();
					logSvc.saveError(e, {
						level: 3,
						name: "[DB_BK_SERVICE] Unable to delete expired DB backups (by DURATION)",
						type: "error",
						workspace: this.workspace,
					});
				});
		} else if (type === "limit") {
			// Mark as deleted based on item count
			return this.model
				.countDocuments({ deletedAt: null })
				.then((count) => {
					const itemsToDelete = count - value;
					if (itemsToDelete > 0) {
						// We need to delete the oldest items, so we sort by 'createdAt'
						return this.model
							.find({ deletedAt: null })
							.sort({ createdAt: 1 })
							.limit(itemsToDelete)
							.then((docs) => {
								const idsToDelete = docs.map((doc) => doc._id);
								return this.softDelete({ _id: { $in: idsToDelete } }, { $set: { deletedAt: now } });
							})
							.catch((e) => {
								console.error(`Unable to delete DB backups:`, e);
							});
					}
				})
				.catch((e) => {
					console.error(`Unable to delete expired DB backups (by LIMIT):`, e);
					const logSvc = new SystemLogService();
					logSvc.saveError(e, {
						level: 3,
						name: "[DB_BK_SERVICE] Unable to delete expired DB backups (by LIMIT)",
						type: "error",
						workspace: this.workspace,
					});
				});
		}
	}
}
