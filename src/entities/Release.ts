import { IsNotEmpty } from "class-validator";
import type { Types } from "mongoose";
import { model, Schema } from "mongoose";

import { AppConfig } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import { BuildStatus } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type { App, Build, IApp, IBuild, IProject, IUser, IWorkspace, Project, User, Workspace } from "./index";

export interface IRelease extends IBase {
	name?: string;
	image?: string;
	cliVersion?: string;
	env?: string;
	envVars?: KubeEnvironmentVariable[];
	prereleaseEnvironment?: any[] | string;
	diginext?: any;
	appConfig?: AppConfig;
	namespace?: string;
	prodYaml?: string;
	preYaml?: string;
	prereleaseUrl?: string;
	productionUrl?: string;
	deploymentYaml?: string;
	endpoint?: string;
	createdBy?: string;
	branch?: string;
	provider?: string;
	cluster?: string;
	projectSlug?: string;
	appSlug?: string;
	providerProjectId?: string;
	buildStatus?: BuildStatus;
	active?: boolean;
	build?: Types.ObjectId | IBuild | string;
	app?: Types.ObjectId | IApp | string;
	owner?: Types.ObjectId | IUser | string;
	project?: Types.ObjectId | IProject | string;
	workspace?: Types.ObjectId | IWorkspace | string;
}

export const releaseSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String },
	image: { type: String },
	cliVersion: { type: String },
	env: { type: String },
	envVars: [{ name: { type: String }, value: { type: String } }],
	prereleaseEnvironment: [{ type: String }],
	diginext: { type: Schema.Types.Mixed },
	appConfig: { type: Map, of: String },
	namespace: { type: String },
	prodYaml: { type: String },
	preYaml: { type: String },
	prereleaseUrl: { type: String },
	productionUrl: { type: String },
	deploymentYaml: { type: String },
	endpoint: { type: String },
	createdBy: { type: String },
	branch: { type: String },
	provider: { type: String },
	cluster: { type: String },
	projectSlug: { type: String },
	appSlug: { type: String },
	providerProjectId: { type: String },
	buildStatus: { type: String },
	active: { type: Boolean },
	build: { type: Schema.Types.ObjectId, ref: "builds" },
	app: { type: Schema.Types.ObjectId, ref: "apps" },
	owner: { type: Schema.Types.ObjectId, ref: "users" },
	project: { type: Schema.Types.ObjectId, ref: "projects" },
	workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
});

export const ReleaseModel = model<IRelease>("Release", releaseSchema, "releases");

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
	buildStatus?: BuildStatus;

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
