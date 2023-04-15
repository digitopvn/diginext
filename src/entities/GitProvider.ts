import { model, Schema } from "mongoose";

import { availableGitProviders, GitProviderType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

export interface IGitProvider extends IBase {
	name?: string;
	host?: string;
	gitWorkspace?: string;
	repo?: {
		url?: string;
		sshPrefix?: string;
	};
	type?: GitProviderType;
}

export const gitProviderSchema = new Schema<IGitProvider>(
	{
		...baseSchemaOptions,
		name: { type: String },
		host: { type: String },
		gitWorkspace: { type: String },
		repo: {
			url: { type: String },
			sshPrefix: { type: String },
		},
		type: { type: String, enum: availableGitProviders },
	},
	{ timestamps: true }
);

export const GitProviderModel = model<IGitProvider>("GitProvider", gitProviderSchema, "git_providers");

@Entity({ name: "git_providers" })
export default class GitProvider extends Base {
	@Column()
	name?: string;

	@Column()
	host?: string;

	@Column()
	gitWorkspace?: string;

	@Column()
	repo?: {
		url?: string;
		sshPrefix?: string;
	};

	@Column()
	type?: GitProviderType;

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

	constructor(data?: GitProvider) {
		super();
		Object.assign(this, data);
	}
}

export { GitProvider };
