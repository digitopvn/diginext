import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IApp } from "./App";
import type { IBase } from "./Base";
import { baseSchemaOptions } from "./Base";
import type { IUser } from "./User";
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
	/**
	 * Latest build of an application in this project
	 */
	latestBuild?: string;
	/**
	 * List of App slugs
	 *
	 * @remarks This can be populated to {App} data
	 */
	appSlugs?: string;
	/**
	 * List of App IDs
	 *
	 * @remarks This can be populated to {App} data
	 */
	apps?: (Types.ObjectId | IApp | string)[];
	owner?: Types.ObjectId | IUser | string;
	workspace?: Types.ObjectId | IWorkspace | string;
}
export type ProjectDto = Omit<IProject, keyof HiddenBodyKeys>;

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
