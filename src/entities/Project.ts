import { IsNotEmpty } from "class-validator";
import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { App, IApp } from "./App";
import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type User from "./User";
import type { IUser } from "./User";
import type Workspace from "./Workspace";
import type { IWorkspace } from "./Workspace";

export interface IProject extends IBase {
	name?: string;
	image?: string;
	slug?: string;
	apiKey?: string;
	clientId?: string;
	clientSecret?: string;
	createdBy?: string;
	lastUpdatedBy?: string;
	latestBuild?: string;
	appSlugs?: string;
	apps?: (Types.ObjectId | IApp | string)[];
	owner?: Types.ObjectId | IUser | string;
	workspace?: Types.ObjectId | IWorkspace | string;
}

export const projectSchema = new Schema(
	{
		...baseSchemaOptions,
		name: { type: String },
		image: { type: String },
		slug: { type: String },
		apiKey: { type: String },
		clientId: { type: String },
		clientSecret: { type: String },
		createdBy: { type: String },
		lastUpdatedBy: { type: String },
		latestBuild: { type: String },
		appSlugs: { type: [String] },
		apps: [{ type: Schema.Types.ObjectId, ref: "apps" }],
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
	},
	{ collection: "projects" }
);

/**
 * Projects
 */
@Entity({ name: "projects" })
export default class Project extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `Project name is required.` })
	name?: string;

	@Column()
	image?: string;

	@Column()
	slug?: string;

	@Column()
	apiKey?: string;

	@Column()
	clientId?: string;

	@Column()
	clientSecret?: string;

	@Column()
	createdBy?: string;

	@Column()
	lastUpdatedBy?: string;

	@Column()
	latestBuild?: string;

	@Column()
	appSlugs?: string;

	/**
	 * List of App IDs
	 *
	 * @remarks This can be populated to {App} data
	 */
	@ObjectIdColumn({ name: "apps" })
	apps?: (ObjectID | App | string)[];

	/**
	 * User ID of the owner
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: Project) {
		super();
		Object.assign(this, data);
	}
}

export { Project };
