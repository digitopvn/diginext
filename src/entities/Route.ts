import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { RequestMethodType } from "@/interfaces/SystemTypes";
import { requestMethodList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaOptions } from "./Base";
import type { IProject } from "./Project";
import type { IUser } from "./User";
import type { IWorkspace } from "./Workspace";

export interface IRoute extends IBase {
	name?: string;
	path?: string;
	methods?: RequestMethodType[];
	owner?: Types.ObjectId | IUser | string;
	project?: Types.ObjectId | IProject | string;
	workspace?: Types.ObjectId | IWorkspace | string;
}
export type RouteDto = Omit<IRoute, keyof HiddenBodyKeys>;

export const routeSchema = new Schema<IRoute>({
	...baseSchemaOptions,
	name: { type: String },
	path: { type: String },
	methods: [{ type: String, enum: requestMethodList }],
	owner: { type: Schema.Types.ObjectId, ref: "users" },
	project: { type: Schema.Types.ObjectId, ref: "projects" },
	workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
});

export const RouteModel = mongoose.model<IRoute>("Route", routeSchema);
