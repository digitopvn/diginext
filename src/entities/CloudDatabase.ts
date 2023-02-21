import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

@Entity({ name: "cloud_databases" })
export default class CloudDatabase extends Base {
	@Column()
	name?: string;

	@Column()
	type?: "mongodb" | "mysql" | "mariadb" | "postgresql" | "sqlserver" | "sqlite" | "redis" | "dynamodb";

	@Column()
	provider?: string;

	@Column()
	user?: string;

	@Column()
	pass?: string;

	@Column()
	host?: string;

	@Column()
	port?: number;

	@Column()
	connectionStr?: string;

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

	constructor(data?: CloudDatabase) {
		super();
		Object.assign(this, data);
	}
}

export { CloudDatabase };
