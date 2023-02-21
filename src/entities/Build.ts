import { IsNotEmpty } from "class-validator";

import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { App } from "./App";
import Base from "./Base";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

@Entity({ name: "builds" })
export default class Build extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `Build name is required.` })
	name?: string;

	@Column({ type: "string" })
	image?: string;

	@Column({ type: "string" })
	tag?: string;

	@Column({ type: "string" })
	slug?: string;

	@Column({ type: "string" })
	env?: string;

	@Column()
	branch?: string;

	@Column({ type: "string" })
	createdBy?: string;

	@Column({ type: "string" })
	status?: "start" | "building" | "failed" | "success";

	@Column({ type: "string" })
	projectSlug?: string;

	@Column({ type: "string" })
	appSlug?: string;

	@Column({ type: "string" })
	logs?: string;

	/**
	 * ID of the app
	 *
	 * @remarks This can be populated to {Project} data
	 */
	@ObjectIdColumn({ name: "apps" })
	app?: ObjectID | App | string;

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

	constructor(data?: Build) {
		super();
		Object.assign(this, data);
	}
}

export { Build };
