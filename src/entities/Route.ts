import type { HiddenBodyKeys } from "@/interfaces";
import type { RequestMethodType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type { Project } from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

export type RouteDto = Omit<Route, keyof HiddenBodyKeys>;

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
