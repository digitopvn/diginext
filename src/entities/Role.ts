import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { IRoutePermission, IRouteScope } from "@/interfaces/IPermission";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

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
}
export type RoleDto = Omit<IRole, keyof HiddenBodyKeys>;

const RoleRouteSchema = new Schema<RoleRoute>({
	route: { type: String },
	scope: [{ type: String, enum: ["all", "workspace", "team", "project", "app"] }],
	permissions: [{ type: String, enum: ["full", "own", "create", "read", "update", "delete"] }],
});

export const roleSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		routes: { type: [RoleRouteSchema] },
		maskedFields: { type: [String] },
		type: { type: String },
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		project: { type: Schema.Types.ObjectId, ref: "projects" },
		workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
	},
	{ collection: "roles", timestamps: true }
);

export const RoleModel = model<IRole>("Role", roleSchema, "roles");
