import type { Document, Types } from "mongoose";
import { Schema } from "mongoose";

import type { IProject, IWorkspace } from ".";
import type { IUser } from "./User";

export interface IBase extends Document {
	_id?: Types.ObjectId | string;
	/**
	 * Slug of an item, generated automatically by its "name"
	 */
	slug?: string;
	active?: boolean;
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
}

export interface EntityConstructor {
	new (...args: any[]): {};
}

export const baseSchemaOptions = {
	slug: { type: String },
	active: { type: Boolean, default: true },
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
	deletedAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: null },
};
