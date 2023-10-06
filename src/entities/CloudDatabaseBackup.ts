import type { ObjectId } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { BackupStatus, CloudDatabaseType } from "@/interfaces/SystemTypes";
import { backupStatusList, cloudDatabaseList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export const retentionTypes = ["limit", "duration"] as const;
export type BackupRetentionType = (typeof retentionTypes)[number];

export interface ICloudDatabaseBackup extends IBase {
	name?: string;
	status?: BackupStatus;
	/**
	 * Backup file path
	 */
	path?: string;
	/**
	 * Backup file URL
	 */
	url?: string;
	type?: CloudDatabaseType;
	dbSlug?: string;
	database?: string | ObjectId;
	retention?: {
		type: BackupRetentionType;
		/**
		 * - `type` is "duration", value is "miliseconds"
		 * - `type` is "limit", value is "MAX AMOUNT OF BACKUPS"
		 */
		value: number;
	};
}
export type CloudDatabaseBackupDto = Omit<ICloudDatabaseBackup, keyof HiddenBodyKeys>;

export const cloudDatabaseBackupSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		path: { type: String },
		url: { type: String },
		status: { type: String, enum: backupStatusList },
		type: { type: String, enum: cloudDatabaseList },
		dbSlug: String,
		database: { type: Schema.Types.ObjectId, ref: "cloud_databases" },
		retention: {
			type: String,
			value: Number,
		},
	},
	{ collection: "cloud_database_backups", timestamps: true }
);

export const CloudDatabaseBackupModel = mongoose.model("CloudDatabaseBackup", cloudDatabaseBackupSchema, "cloud_database_backups");
