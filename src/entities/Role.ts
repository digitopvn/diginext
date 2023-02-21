import { IsNotEmpty } from "class-validator";

import type { IRoutePermission } from "@/interfaces/IPermission";
import { IRouteScope } from "@/interfaces/IPermission";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type { Project } from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

@Entity({ name: "role_routes" })
export class RoleRoute {
	@Column()
	route: string;

	@Column()
	scope: IRouteScope;

	@Column({ array: true })
	permissions: IRoutePermission[];
}

@Entity({ name: "roles" })
export default class Role extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `Role name is required.` })
	name: string;

	@Column({ array: true })
	routes: RoleRoute[];

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

	constructor(data?: Role) {
		super();
		Object.assign(this, data);
	}
}

export { Role };
