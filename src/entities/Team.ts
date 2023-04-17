import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaOptions } from "./Base";
import type { IProject, IUser, IWorkspace } from "./index";
// import type { User } from "./User";
// import type { Workspace } from "./Workspace";

export interface ITeam extends IBase {
	name: string;
	image?: string;
	owner?: Types.ObjectId | IUser | string;
	project?: Types.ObjectId | IProject | string;
	workspace?: Types.ObjectId | IWorkspace;
}
export type TeamDto = Omit<ITeam, keyof HiddenBodyKeys>;

export const teamSchema = new Schema(
	{
		...baseSchemaOptions,
		name: { type: String, required: true },
		image: { type: String },
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		project: { type: Schema.Types.ObjectId, ref: "projects" },
		workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
	},
	{ collection: "teams" }
);
