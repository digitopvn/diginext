import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type GitProvider from "./GitProvider";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

@Entity({ name: "frameworks" })
export default class Framework extends Base<Framework> {
	@Column()
	name: string;

	@Column()
	host?: string;

	/**
	 * ID of the Git Provider
	 *
	 * @remarks This can be populated to {GitProvider} data
	 */
	@ObjectIdColumn({ name: "git_providers" })
	git?: ObjectID | GitProvider;

	@Column()
	repoURL?: string;

	@Column()
	repoSSH?: string;

	@Column({ type: "string" })
	mainBranch?: string;

	/**
	 * Number of downloads
	 */
	@Column({ default: 0 })
	downloads?: number;

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

	constructor(data?: Framework) {
		super();
		Object.assign(this, data);
	}
}

export { Framework };
