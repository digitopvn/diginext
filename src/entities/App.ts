import { IsNotEmpty } from "class-validator";

import type { DeployEnvironment } from "@/interfaces/DeployEnvironment";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

@Entity({ name: "apps" })
export default class App extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `App name is required.` })
	name?: string;

	@Column()
	image?: string;

	@Column()
	slug?: string;

	@Column()
	createdBy?: string;

	@Column()
	lastUpdatedBy?: string;

	@Column()
	git?: {
		provider?: string;
		repoURL?: string;
		repoSSH?: string;
	};

	@Column()
	framework?: {
		name?: string;
		slug?: string;
		repoURL?: string;
		repoSSH?: string;
	};

	@Column()
	environment?: {
		[key: string]: DeployEnvironment | string;
	};

	@Column()
	deployEnvironment?: {
		[key: string]: DeployEnvironment;
	};

	@Column()
	latestBuild?: string;

	@Column({ type: "string" })
	projectSlug?: string;

	/**
	 * Owner ID of the app
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * Project ID of the app
	 *
	 * @remarks This can be populated to {Project} data
	 */
	@ObjectIdColumn({ name: "projects" })
	project?: ObjectID | Project | string;

	/**
	 * Workspace ID of the app
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: App) {
		super();
		Object.assign(this, data);
	}
}

export { App };
