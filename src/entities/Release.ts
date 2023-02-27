import { IsNotEmpty } from "class-validator";

import { AppConfig } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type { App, Build, Project, User, Workspace } from "./index";

@Entity({ name: "releases" })
export default class Release extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `User name is required.` })
	name?: string;

	@Column()
	image?: string;

	@Column()
	cliVersion?: string;

	/**
	 * Targeted environment.
	 * @example dev, prod, staging, canary,...
	 */
	@Column()
	env?: string;

	/**
	 * Environment variables
	 */
	@Column()
	envVars?: KubeEnvironmentVariable[];

	/**
	 * ONLY PRE-RELEASE - Environment variables
	 */
	@Column()
	prereleaseEnvironment?: any[] | string;

	/**
	 * Old "diginext.json"
	 */
	@Column()
	diginext?: any;

	@Column()
	appConfig?: AppConfig;

	@Column()
	namespace?: string;

	@Column()
	prodYaml?: string;

	@Column()
	preYaml?: string;

	@Column()
	prereleaseUrl?: string;

	@Column()
	productionUrl?: string;

	/**
	 * Deployment YAML
	 */
	@Column()
	deploymentYaml?: string;

	/**
	 * Release endpoint (development/.../production URL)
	 */
	@Column()
	endpoint?: string;

	@Column()
	createdBy?: string;

	@Column()
	branch?: string;

	@Column()
	provider?: string;

	/**
	 * Short name of the targeted cluster to deploy to.
	 */
	@Column()
	cluster?: string;

	@Column()
	projectSlug?: string;

	@Column()
	appSlug?: string;

	@Column()
	providerProjectId?: string;

	@Column()
	buildStatus?: "start" | "building" | "failed" | "success";

	@Column({ type: "boolean" })
	active?: boolean;

	/**
	 * ID of the build
	 *
	 * @remarks This can be populated to {Build} data
	 */
	@ObjectIdColumn({ name: "builds" })
	build?: ObjectID | Build | string;

	/**
	 * ID of the app
	 *
	 * @remarks This can be populated to {App} data
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

	constructor(data?: Release) {
		super();
		Object.assign(this, data);
	}
}

export { Release };
