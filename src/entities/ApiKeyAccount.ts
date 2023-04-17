import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import { baseSchemaDefinitions } from "./Base";
import type { IUser } from "./User";

export interface IApiKeyAccount extends IUser {
	/**
	 * Service Account is also a User with unexpired access token.
	 */
	type?: string;
}
export type ApiKeyAccountDto = Omit<IApiKeyAccount, keyof HiddenBodyKeys>;

export const apiKeyAccountSchema = new Schema<IApiKeyAccount>(
	{
		...baseSchemaDefinitions,
		name: {
			type: String,
			maxlength: 250,
		},
		username: {
			type: String,
			unique: true,
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
		collection: "api_key",
		timestamps: true,
	}
);
