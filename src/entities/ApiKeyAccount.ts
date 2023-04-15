import { Schema } from "mongoose";

import { Column, Entity } from "@/libs/typeorm";

import { baseSchemaOptions } from "./Base";
import type { IUser } from "./User";
import User from "./User";

export interface IApiKeyAccount extends IUser {
	type?: string;
}

export const apiKeyAccountSchema = new Schema<IApiKeyAccount>(
	{
		...baseSchemaOptions,
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
	}
);

@Entity({ name: "api_key" })
export default class ApiKeyAccount extends User {
	/**
	 * Service Account is also a User with unexpired access token.
	 */
	@Column({ default: "api_key" })
	type?: string;

	constructor(data?: ApiKeyAccount | any) {
		super();
		Object.assign(this, data);
	}
}

export { ApiKeyAccount };
