import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
// import type { User } from "./User";
// import type { Workspace } from "./Workspace";

export interface ITeam extends IBase {
	name: string;
	image?: string;
}
export type TeamDto = Omit<ITeam, keyof HiddenBodyKeys>;

export const teamSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String, required: true },
		image: { type: String },
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		project: { type: Schema.Types.ObjectId, ref: "projects" },
		workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
	},
	{ collection: "teams", timestamps: true }
);
