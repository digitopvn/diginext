import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { BitbucketOAuthOptions, GithubOAuthOptions } from "./GitProvider";
import type { IRole } from "./Role";
import type { ITeam } from "./Team";
import type { IWorkspace } from "./Workspace";

export interface ProviderInfo {
	name: string;
	user_id?: string;
	access_token?: string;
}

export interface AccessTokenInfo {
	access_token: string;
	expiredTimestamp: number;
	expiredDate: Date;
	expiredDateGTM7: string;
}

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
	 * Github credentials
	 */
	github?: GithubOAuthOptions;
	/**
	 * Bitbucket credentials
	 */
	bitbucket?: BitbucketOAuthOptions;
	/**
	 * User token
	 */
	token?: AccessTokenInfo;
	roles?: (IRole | Types.ObjectId | string)[];
	activeRole?: IRole | Types.ObjectId | string;
	teams?: (ITeam | Types.ObjectId | string)[];
	workspaces?: (IWorkspace | Types.ObjectId | string)[];
	activeWorkspace?: IWorkspace | Types.ObjectId | string;
}

export const userSchema = new Schema<IUser>(
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
			type: [Object],
			default: [],
		},
		password: {
			type: String,
		},
		github: {
			consumer_key: { type: String },
			consumer_secret: { type: String },
			username: { type: String },
			app_password: { type: String },
			verified: { type: Boolean },
		},
		bitbucket: {
			client_id: { type: String },
			client_secret: { type: String },
			username: { type: String },
			personal_access_token: { type: String },
			verified: { type: Boolean },
		},
		token: {
			type: Object,
		},
		roles: {
			type: [Schema.Types.ObjectId],
			ref: "roles",
			default: [],
		},
		activeRole: {
			type: Schema.Types.ObjectId,
			ref: "roles",
		},
		teams: {
			type: [Schema.Types.ObjectId],
			ref: "teams",
			default: [],
		},
		workspaces: {
			type: [Schema.Types.ObjectId],
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
	},
	{
		collection: "users",
		timestamps: true,
	}
);