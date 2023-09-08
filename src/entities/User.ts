import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { WebhookChannel } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
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
		settings: { type: Schema.Types.Mixed },
	},
	{
		collection: "users",
		timestamps: true,
	}
);
