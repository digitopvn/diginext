import mongoose, { Schema } from "mongoose";

import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

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

export const cloudDatabaseSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String },
	type: { type: String, enum: ["mongodb", "mysql", "mariadb", "postgresql", "sqlserver", "sqlite", "redis", "dynamodb"] },
	provider: { type: String },
	user: { type: String },
	pass: { type: String },
	host: { type: String },
	port: { type: Number },
	connectionStr: { type: String },
});

export const CloudDatabaseModel = mongoose.model("CloudDatabase", cloudDatabaseSchema, "cloud_databases");

@Entity({ name: "cloud_databases" })
export default class CloudDatabase extends Base {
	@Column()
	name?: string;

	@Column()
	type?: "mongodb" | "mysql" | "mariadb" | "postgresql" | "sqlserver" | "sqlite" | "redis" | "dynamodb";

	@Column()
	provider?: string;

	@Column()
	user?: string;

	@Column()
	pass?: string;

	@Column()
	host?: string;

	@Column()
	port?: number;

	@Column()
	connectionStr?: string;

	/**
	 * User ID of the owner
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * ID of the project
	 *
	 * @remarks This can be populated to {Project} data
	 */
	@ObjectIdColumn({ name: "projects" })
	project?: ObjectID | Project | string;

	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: CloudDatabase) {
		super();
		Object.assign(this, data);
	}
}

export { CloudDatabase };
