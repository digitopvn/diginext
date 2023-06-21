import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import { type CloudDatabaseType, cloudDatabaseList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface ICloudDatabase extends IBase {
	name?: string;
	verified?: boolean;
	type?: CloudDatabaseType;
	provider?: string;
	user?: string;
	pass?: string;
	host?: string;
	port?: number;
	url?: string;
}
export type CloudDatabaseDto = Omit<ICloudDatabase, keyof HiddenBodyKeys>;

export const cloudDatabaseSchema = new Schema(
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
		url: { type: String },
	},
	{ collection: "cloud_databases", timestamps: true }
);

export const CloudDatabaseModel = mongoose.model("CloudDatabase", cloudDatabaseSchema, "cloud_databases");
