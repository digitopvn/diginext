import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { IProject, IWorkspace } from "./index";
import type { IUser } from "./User";

export interface IBase {
	_id?: Types.ObjectId | string;
	/**
	 * Slug of an item, generated automatically by its "name"
	 */
	slug?: string;
	active?: boolean;
	/**
	 * `TRUE` -> any members can read
	 * `FALSE` -> only admins can read
	 * @default true
	 */
	public?: boolean;
	metadata?: any;
	/**
	 * Owner ID of the app
	 *
	 * @remarks This can be populated to {IUser} data
	 */
	owner?: Types.ObjectId | IUser | string;
	/**
	 * ID of the project
	 *
	 * @remarks This can be populated to {IProject} data
	 */
	project?: Types.ObjectId | IProject | string;
	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {IWorkspace} data
	 */
	workspace?: Types.ObjectId | IWorkspace | string;
	createdAt?: Date;
	deletedAt?: Date;
	updatedAt?: Date;
	migratedAt?: Date;
}

export interface EntityConstructor {
	new (...args: any[]): {};
}

export const baseSchemaDefinitions = {
	slug: { type: String },
	active: { type: Boolean, default: true },
	public: { type: Boolean, default: true },
	metadata: { type: Object },
	owner: {
		type: Schema.Types.ObjectId,
		ref: "users",
	},
	project: {
		type: Schema.Types.ObjectId,
		ref: "projects",
	},
	workspace: {
		type: Schema.Types.ObjectId,
		ref: "workspaces",
	},
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	deletedAt: { type: Date },
	migratedAt: { type: Date },
};
