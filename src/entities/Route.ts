import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { RequestMethodType } from "@/interfaces/SystemTypes";
import { requestMethodList } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type { IProject, Project } from "./Project";
import type User from "./User";
import type { IUser } from "./User";
import type Workspace from "./Workspace";
import type { IWorkspace } from "./Workspace";

export type RouteDto = Omit<Route, keyof HiddenBodyKeys>;

export interface IRoute extends IBase {
	name?: string;
	path?: string;
	methods?: RequestMethodType[];
	owner?: Types.ObjectId | IUser | string;
	project?: Types.ObjectId | IProject | string;
	workspace?: Types.ObjectId | IWorkspace | string;
}

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

@Entity({ name: "routes" })
export default class Route extends Base {
	@Column()
	name?: string;

	@Column()
	path?: string;

	@Column()
	methods?: RequestMethodType[];

	/**
	 * User ID of the owner
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * ID of the project
	 *
	 * @remarks This can be populated to {Project} data
	 */
	@ObjectIdColumn({ name: "projects" })
	project?: ObjectID | Project | string;

	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: RouteDto) {
		super();
		Object.assign(this, data);
	}
}

export { Route };
