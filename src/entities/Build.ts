import { IsNotEmpty } from "class-validator";
import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import { BuildStatus } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { App, IApp } from "./App";
import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type ContainerRegistry from "./ContainerRegistry";
import type { IContainerRegistry } from "./ContainerRegistry";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

export interface IBuild extends IBase {
	name?: string;
	image?: string;
	tag?: string;
	startTime?: Date;
	endTime?: Date;
	duration?: number;
	env?: string;
	branch?: string;
	cliVersion?: string;
	createdBy?: string;
	status?: BuildStatus;
	projectSlug?: string;
	appSlug?: string;
	logs?: string;
	registry?: Types.ObjectId | IContainerRegistry | string;
	app?: Types.ObjectId | IApp | string;
}

export const buildSchema = new Schema(
	{
		...baseSchemaOptions,
		name: { type: String },
		image: { type: String },
		tag: { type: String },
		startTime: { type: Date },
		endTime: { type: Date },
		duration: { type: Number },
		env: { type: String },
		branch: { type: String },
		cliVersion: { type: String },
		createdBy: { type: String },
		status: { type: String, enum: ["pending", "building", "succeeded", "failed", "cancelled"] },
		projectSlug: { type: String },
		appSlug: { type: String },
		logs: { type: String },
		registry: { type: Schema.Types.ObjectId, ref: "container_registries" },
		app: { type: Schema.Types.ObjectId, ref: "apps" },
	},
	{ collection: "builds" }
);

export const BuildModel = mongoose.model("Build", buildSchema, "builds");

@Entity({ name: "builds" })
export default class Build extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `Build name is required.` })
	name?: string;

	@Column({ type: "string" })
	image?: string;

	/**
	 * Image tag is also "buildNumber"
	 */
	@Column({ type: "string" })
	tag?: string;

	/**
	 * Build start time
	 */
	@Column({ type: "datetime" })
	startTime?: Date;

	/**
	 * Build end time
	 */
	@Column({ type: "datetime" })
	endTime?: Date;

	/**
	 * Build duration in miliseconds
	 */
	@Column({ type: "number" })
	duration?: number;

	/**
	 * Build for which deploy environment
	 * - **[OPTIONAL] SHOULD NOT rely on this!**
	 * - A build should be able to used for any deploy environments.
	 */
	@Column({ type: "string" })
	env?: string;

	/**
	 * Build from which git branch
	 */
	@Column()
	branch?: string;

	@Column()
	cliVersion?: string;

	@Column({ type: "string" })
	createdBy?: string;

	@Column({ type: "string" })
	status?: BuildStatus;

	@Column({ type: "string" })
	projectSlug?: string;

	@Column({ type: "string" })
	appSlug?: string;

	@Column({ type: "string" })
	logs?: string;

	/**
	 * ID of the container registry
	 *
	 * @remarks This can be populated to {ContainerRegistry} data
	 */
	@Column({ type: "string" })
	registry?: ObjectID | ContainerRegistry | string;

	/**
	 * ID of the app
	 *
	 * @remarks This can be populated to {Project} data
	 */
	@ObjectIdColumn({ name: "apps" })
	app?: ObjectID | App | string;

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

	constructor(data?: Build) {
		super();
		Object.assign(this, data);
	}
}

export { Build };
