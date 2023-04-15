import type { Types } from "mongoose";
import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { IRoutePermission, IRouteScope } from "@/interfaces/IPermission";

import type { IBase } from "./Base";
import { baseSchemaOptions } from "./Base";
import type { IProject } from "./Project";
import type { IUser } from "./User";
import type { IWorkspace } from "./Workspace";

export interface RoleRoute {
	/**
	 * Route path
	 * @example /api/v1/healthz
	 */
	route: string;
	/**
	 * @default ["full"]
	 */
	permissions: IRoutePermission[];
	/**
	 * (TBC)
	 * @default all
	 * @example all
	 */
	scope?: IRouteScope;
}

export interface IRole extends IBase {
	name: string;
	routes: RoleRoute[];
	maskedFields?: string[];
	/**
	 * One of:
	 * - undefined | "custom": custom role
	 * - "admin": default super admin role
	 * - "member": default member role
	 * - "moderator": default moderator role
	 */
	type?: string;
	owner?: Types.ObjectId | IUser | string;
	project?: Types.ObjectId | IProject | string;
	workspace?: Types.ObjectId | IWorkspace | string;
}
export type RoleDto = Omit<IRole, keyof HiddenBodyKeys>;

const RoleRouteSchema = new Schema({
	path: { type: String },
	methods: { type: [String] },
	route: { type: String },
	scope: { type: String, enum: ["all", "workspace", "team", "project", "app"], required: true },
	permission: { type: String, enum: ["full", "own", "create", "read", "update", "delete"], required: true },
});

export const roleSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String, required: true },
	routes: { type: [RoleRouteSchema], required: true },
	maskedFields: { type: [String] },
	type: { type: String },
	owner: { type: Schema.Types.ObjectId, ref: "users" },
	project: { type: Schema.Types.ObjectId, ref: "projects" },
	workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
});

export const RoleModel = model<IRole>("Role", roleSchema, "roles");
