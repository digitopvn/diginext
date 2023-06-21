import type { ObjectId } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { CloudDatabaseType } from "@/interfaces/SystemTypes";
import { cloudDatabaseList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface ICloudDatabaseBackup extends IBase {
	name?: string;
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
}
export type CloudDatabaseBackupDto = Omit<ICloudDatabaseBackup, keyof HiddenBodyKeys>;

export const cloudDatabaseBackupSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		path: { type: String },
		url: { type: String },
		type: { type: String, enum: cloudDatabaseList },
		dbSlug: String,
		database: { type: Schema.Types.ObjectId, ref: "cloud_databases" },
	},
	{ collection: "cloud_database_backups", timestamps: true }
);

export const CloudDatabaseBackupModel = mongoose.model("CloudDatabaseBackup", cloudDatabaseBackupSchema, "cloud_database_backups");
