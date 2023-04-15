import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import { availableGitProviders, GitProviderType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type GitProvider from "./GitProvider";
import type { IGitProvider } from "./GitProvider";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

export type FrameworkDto = Omit<Framework, keyof HiddenBodyKeys>;

export interface IFramework extends IBase {
	name?: string;
	host?: string;
	gitProvider?: GitProviderType;
	isPrivate?: boolean;
	git?: Types.ObjectId | IGitProvider;
	repoURL?: string;
	repoSSH?: string;
	mainBranch?: string;
	downloads?: number;
}

export const frameworkSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String },
	host: { type: String },
	gitProvider: { type: String, enum: availableGitProviders },
	isPrivate: { type: Boolean },
	git: { type: Schema.Types.ObjectId, ref: "git_providers" },
	repoURL: { type: String },
	repoSSH: { type: String },
	mainBranch: { type: String },
	downloads: { type: Number },
});

export const FrameworkModel = mongoose.model("frameworks", frameworkSchema, "frameworks");

@Entity({ name: "frameworks" })
export default class Framework extends Base {
	@Column()
	name?: string;

	@Column()
	host?: string;

	/**
	 * Git provider name
	 */
	@Column()
	gitProvider?: GitProviderType;

	/**
	 * Git repository access privacy
	 */
	@Column()
	isPrivate?: boolean;

	/**
	 * ID of the Git Provider
	 *
	 * @remarks This can be populated to {GitProvider} data
	 */
	@ObjectIdColumn({ name: "git_providers" })
	git?: ObjectID | GitProvider;

	@Column()
	repoURL?: string;

	@Column()
	repoSSH?: string;

	@Column({ type: "string" })
	mainBranch?: string;

	/**
	 * Number of downloads
	 */
	@Column({ default: 0 })
	downloads?: number;

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

	constructor(data?: Framework) {
		super();
		Object.assign(this, data);
	}
}

export { Framework };
