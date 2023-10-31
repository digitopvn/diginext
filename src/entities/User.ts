import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { WebhookChannel } from "@/interfaces/SystemTypes";

import type { ICloudDatabase, ICloudDatabaseBackup, IContainerRegistry, IFramework, IGitProvider } from ".";
import type { IApp } from "./App";
import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { ICluster } from "./Cluster";
import type { IProject } from "./Project";
import type { IRole } from "./Role";
import type { ITeam } from "./Team";
import type { IWorkspace } from "./Workspace";

export interface ProviderInfo {
	name: string;
	user_id?: string;
	access_token?: string;
}

const providerInfoSchema = new Schema({
	name: {
		type: String,
	},
	user_id: {
		type: String,
	},
	access_token: {
		type: String,
	},
});

export interface AccessTokenInfo {
	access_token: string;
	refresh_token?: string;
	expiredTimestamp: number;
	expiredDate: Date;
	expiredDateGTM7: string;
}

const accessTokenInfoSchema = new Schema({
	access_token: {
		type: String,
		required: true,
	},
	refresh_token: {
		type: String,
	},
	expiredTimestamp: {
		type: Number,
		required: true,
	},
	expiredDate: {
		type: Date,
		required: true,
	},
	expiredDateGTM7: {
		type: String,
		required: true,
	},
});

/**
 * ### User access permission settings:
 * - `undefined`: all
 * - `[]`: none
 * - `[ ...project_id... ]`: some
 */
export type UserAccessPermissions = {
	projects?: (IProject | Types.ObjectId | string)[];
	apps?: (IApp | Types.ObjectId | string)[];
	clusters?: (ICluster | Types.ObjectId | string)[];
	databases?: (ICloudDatabase | Types.ObjectId | string)[];
	database_backups?: (ICloudDatabaseBackup | Types.ObjectId | string)[];
	gits?: (IGitProvider | Types.ObjectId | string)[];
	frameworks?: (IFramework | Types.ObjectId | string)[];
	container_registries?: (IContainerRegistry | Types.ObjectId | string)[];
};

export type UserDto = Omit<IUser, keyof HiddenBodyKeys>;

// export type IUser = typeof User;

export interface IUser extends IBase {
	name: string;
	/**
	 * Unique username of a user
	 * This equavilent with "slug"
	 */
	username?: string;
	type?: string;
	/**
	 * User email address
	 */
	email: string;
	/**
	 * Is this user's email or phone verified?
	 */
	verified?: boolean;
	/**
	 * User profile picture URL
	 */
	image?: string;
	/**
	 * List of Cloud Providers which this user can access to
	 */
	providers?: ProviderInfo[];
	/**
	 * User password (hashed)
	 */
	password?: string;
	/**
	 * User token
	 */
	token?: AccessTokenInfo;
	roles?: (IRole | Types.ObjectId | string)[];
	activeRole?: IRole | Types.ObjectId | string;
	teams?: (ITeam | Types.ObjectId | string)[];
	workspaces?: (IWorkspace | Types.ObjectId | string)[];
	activeWorkspace?: IWorkspace | Types.ObjectId | string;
	/**
	 * User access permission settings
	 */
	allowAccess?: UserAccessPermissions;
	/**
	 * User settings
	 */
	settings?: {
		notification: {
			workspace?: WebhookChannel[];
			project?: WebhookChannel[];
			app?: WebhookChannel[];
			build?: WebhookChannel[];
			deploy?: WebhookChannel[];
		};
	};
}

export const userSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: {
			type: String,
			maxlength: 250,
		},
		username: {
			type: String,
		},
		type: {
			type: String,
			default: "user",
		},
		email: {
			type: String,
			maxlength: 500,
		},
		verified: {
			type: Boolean,
			default: false,
		},
		image: {
			type: String,
		},
		providers: {
			type: [providerInfoSchema],
			default: [],
		},
		password: {
			type: String,
		},
		token: {
			type: accessTokenInfoSchema,
		},
		roles: {
			type: [{ type: Schema.Types.ObjectId, ref: "roles" }],
			ref: "roles",
			default: [],
		},
		activeRole: {
			type: Schema.Types.ObjectId,
			ref: "roles",
		},
		teams: {
			type: [{ type: Schema.Types.ObjectId, ref: "teams" }],
			ref: "teams",
			default: [],
		},
		workspaces: {
			type: [{ type: Schema.Types.ObjectId, ref: "workspaces" }],
			ref: "workspaces",
			default: [],
		},
		activeWorkspace: {
			type: Schema.Types.ObjectId,
			ref: "workspaces",
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: "users",
		},
		ownerSlug: String,
		allowAccess: {
			projects: [{ type: Schema.Types.ObjectId, ref: "projects" }],
			apps: [{ type: Schema.Types.ObjectId, ref: "apps" }],
			clusters: [{ type: Schema.Types.ObjectId, ref: "clusters" }],
			databases: [{ type: Schema.Types.ObjectId, ref: "cloud_databases" }],
			database_backups: [{ type: Schema.Types.ObjectId, ref: "cloud_database_backups" }],
			gits: [{ type: Schema.Types.ObjectId, ref: "git_providers" }],
			frameworks: [{ type: Schema.Types.ObjectId, ref: "frameworks" }],
			container_registries: [{ type: Schema.Types.ObjectId, ref: "container_registries" }],
		},
		settings: { type: Schema.Types.Mixed },
	},
	{
		collection: "users",
		timestamps: true,
	}
);
