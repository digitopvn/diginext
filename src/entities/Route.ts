import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { RequestMethodType } from "@/interfaces/SystemTypes";
import { requestMethodList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface IRoute extends IBase {
	name?: string;
	path?: string;
	methods?: RequestMethodType[];
}
export type RouteDto = Omit<IRoute, keyof HiddenBodyKeys>;

export const routeSchema = new Schema<IRoute>(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		path: { type: String },
		methods: [{ type: String, enum: requestMethodList }],
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		project: { type: Schema.Types.ObjectId, ref: "projects" },
		workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
	},
	{ collection: "routes", timestamps: true }
);

export const RouteModel = mongoose.model<IRoute>("Route", routeSchema);
