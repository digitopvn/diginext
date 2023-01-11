import { IsNotEmpty } from "class-validator";

import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { App } from "./App";
import Base from "./Base";
import type User from "./User";
import type Workspace from "./Workspace";

@Entity({ name: "projects" })
export default class Project extends Base<Project> {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `Project name is required.` })
	name?: string;

	@Column()
	image?: string;

	@Column()
	slug?: string;

	@Column()
	apiKey?: string;

	@Column()
	clientId?: string;

	@Column()
	clientSecret?: string;

	@Column()
	createdBy?: string;

	@Column()
	lastUpdatedBy?: string;

	@Column()
	latestBuild?: string;

	@Column()
	appSlugs?: string;

	/**
	 * List of App IDs
	 *
	 * @remarks This can be populated to {App} data
	 */
	@ObjectIdColumn({ name: "apps" })
	apps?: ObjectID[] | App[] | string[];

	/**
	 * User ID of the owner
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: Project) {
		super();
		Object.assign(this, data);
	}
}

export { Project };
