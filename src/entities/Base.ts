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
	 * Owner's username
	 */
	ownerSlug?: string;
	/**
	 * Owner ID of the app
	 *
	 * @remarks This can be populated to {IUser} data
	 */
	owner?: Types.ObjectId | IUser | string;
	ownerId?: Types.ObjectId | string;
	/**
	 * ID of the project
	 *
	 * @remarks This can be populated to {IProject} data
	 */
	project?: Types.ObjectId | IProject | string;
	projectId?: Types.ObjectId | string;
	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {IWorkspace} data
	 */
	workspace?: Types.ObjectId | IWorkspace | string;
	workspaceId?: Types.ObjectId | string;
	/**
	 * SLUG of the workspace
	 *
	 * @remarks This can be populated to {IWorkspace} data
	 */
	workspaceSlug?: string;
	/**
	 * Created date
	 */
	createdAt?: Date;
	/**
	 * Deleted date
	 */
	deletedAt?: Date;
	/**
	 * Updated date
	 */
	updatedAt?: Date;
	/**
	 * Migrated date
	 */
	migratedAt?: Date;
	updatedBy?: Types.ObjectId | IUser | string;
	updatedById?: Types.ObjectId | string;
	deletedBy?: Types.ObjectId | IUser | string;
	deletedById?: Types.ObjectId | string;
}

export interface EntityConstructor {
	new (...args: any[]): {};
}

export const baseSchemaDefinitions = {
	slug: { type: String, unique: true },
	active: { type: Boolean, default: true },
	public: { type: Boolean, default: true },
	metadata: { type: Object },
	ownerSlug: { type: String },
	owner: {
		type: Schema.Types.ObjectId,
		ref: "users",
	},
	ownerId: { type: Schema.Types.ObjectId, ref: "users" },
	project: {
		type: Schema.Types.ObjectId,
		ref: "projects",
	},
	projectId: { type: Schema.Types.ObjectId, ref: "projects" },
	workspace: {
		type: Schema.Types.ObjectId,
		ref: "workspaces",
	},
	workspaceId: { type: Schema.Types.ObjectId, ref: "workspaces" },
	workspaceSlug: { type: String },
	updatedBy: {
		type: Schema.Types.ObjectId,
		ref: "users",
	},
	updatedById: { type: Schema.Types.ObjectId, ref: "users" },
	deletedBy: {
		type: Schema.Types.ObjectId,
		ref: "users",
	},
	deletedById: { type: Schema.Types.ObjectId, ref: "users" },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	deletedAt: { type: Date },
	migratedAt: { type: Date },
};
