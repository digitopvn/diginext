import type { ObjectId } from "mongoose";
import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
// import type { User } from "./User";
// import type { Workspace } from "./Workspace";

export interface IUserToken extends IBase {
	userId: string | ObjectId;
	token: string;
}
export type UserTokenDto = Omit<IUserToken, keyof HiddenBodyKeys>;

export const userTokenSchema = new Schema<IUserToken>(
	{
		...baseSchemaDefinitions,
		userId: { type: Schema.Types.ObjectId, ref: "users" },
		token: { type: String },
	},
	{ collection: "user_tokens", timestamps: true }
);
