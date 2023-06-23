import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import { type CloudDatabaseType, cloudDatabaseList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { ICronjob } from "./Cronjob";

export interface ICloudDatabase extends IBase {
	name?: string;
	verified?: boolean;
	type?: CloudDatabaseType;
	provider?: string;
	user?: string;
	pass?: string;
	host?: string;
	port?: number;
	authDb?: string;
	url?: string;
	/**
	 * Cronjob ID
	 */
	autoBackup?: string | ICronjob;
}
export type CloudDatabaseDto = Omit<ICloudDatabase, keyof HiddenBodyKeys>;

export const cloudDatabaseSchema = new Schema<ICloudDatabase>(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		verified: Boolean,
		type: { type: String, enum: cloudDatabaseList },
		provider: { type: String },
		user: { type: String },
		pass: { type: String },
		host: { type: String },
		port: { type: Number },
		authDb: String,
		url: { type: String },
		autoBackup: { type: Schema.Types.ObjectId, ref: "cronjobs" },
	},
	{ collection: "cloud_databases", timestamps: true }
);

export const CloudDatabaseModel = mongoose.model("CloudDatabase", cloudDatabaseSchema, "cloud_databases");
