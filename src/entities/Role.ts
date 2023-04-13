import { IsNotEmpty } from "class-validator";

import type { IRoutePermission, IRouteScope } from "@/interfaces/IPermission";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type { Project } from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

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

@Entity({ name: "roles" })
export default class Role extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `Role name is required.` })
	name: string;

	@Column({ array: true })
	routes: RoleRoute[];

	@Column({ array: true })
	maskedFields?: string[];

	/**
	 * One of:
	 * - undefined | "custom": custom role
	 * - "admin": default super admin role
	 * - "member": default member role
	 * - "moderator": default moderator role
	 */
	@Column({ default: "member" })
	type?: string;

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

	constructor(data?: Role | any) {
		super();
		Object.assign(this, data);
	}
}

export { Role };
