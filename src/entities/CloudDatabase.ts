import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaOptions } from "./Base";

export interface ICloudDatabase extends IBase {
	name?: string;
	type?: "mongodb" | "mysql" | "mariadb" | "postgresql" | "sqlserver" | "sqlite" | "redis" | "dynamodb";
	provider?: string;
	user?: string;
	pass?: string;
	host?: string;
	port?: number;
	connectionStr?: string;
}
export type CloudDatabaseDto = Omit<ICloudDatabase, keyof HiddenBodyKeys>;

export const cloudDatabaseSchema = new Schema(
	{
		...baseSchemaOptions,
		name: { type: String },
		type: { type: String, enum: ["mongodb", "mysql", "mariadb", "postgresql", "sqlserver", "sqlite", "redis", "dynamodb"] },
		provider: { type: String },
		user: { type: String },
		pass: { type: String },
		host: { type: String },
		port: { type: Number },
		connectionStr: { type: String },
	},
	{ collection: "cloud_databases" }
);

export const CloudDatabaseModel = mongoose.model("CloudDatabase", cloudDatabaseSchema, "cloud_databases");
