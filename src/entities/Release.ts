import type { Types } from "mongoose";
import { model, Schema } from "mongoose";

import type { AppConfig, HiddenBodyKeys } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { BuildStatus, DeployStatus } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { IApp, IBuild } from "./index";

export interface IRelease extends IBase {
	name?: string;
	image?: string;
	cliVersion?: string;
	/**
	 * Targeted environment.
	 * @example dev, prod, staging, canary,...
	 */
	env?: string;
	/**
	 * Environment variables
	 */
	envVars?: KubeEnvironmentVariable[];
	/**
	 * ONLY PRE-RELEASE - Environment variables
	 */
	prereleaseEnvironment?: any[] | string;
	/**
	 * @deprecated
	 * Old "diginext.json"
	 */
	diginext?: any;
	appConfig?: AppConfig;
	namespace?: string;
	/**
	 * @deprecated
	 * Use `deploymentYaml` instead.
	 */
	prodYaml?: string;
	preYaml?: string;
	prereleaseUrl?: string;
	productionUrl?: string;
	deploymentYaml?: string;
	endpoint?: string;
	createdBy?: string;
	branch?: string;
	provider?: string;
	/**
	 * Cluster's slug
	 */
	cluster?: string;
	projectSlug?: string;
	appSlug?: string;
	providerProjectId?: string;
	buildStatus?: BuildStatus;
	status?: DeployStatus;
	active?: boolean;
	/**
	 * Deploy start time
	 */
	startTime?: Date;
	/**
	 * Deploy end time
	 */
	endTime?: Date;
	/**
	 * Deploy duration in miliseconds
	 */
	duration?: number;
	/**
	 * URL of the webpage screenshot
	 */
	screenshot?: string;
	/**
	 * ID of the build
	 *
	 * @remarks This can be populated to {IBuild} data
	 */
	build?: Types.ObjectId | IBuild | string;
	/**
	 * ID of the app
	 *
	 * @remarks This can be populated to {IApp} data
	 */
	app?: Types.ObjectId | IApp | string;
}
export type ReleaseDto = Omit<IRelease, keyof HiddenBodyKeys>;

export const releaseSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		image: { type: String },
		cliVersion: { type: String },
		env: { type: String },
		envVars: [{ name: { type: String }, value: { type: String } }],
		prereleaseEnvironment: [{ type: String }],
		diginext: { type: String },
		appConfig: { type: Object },
		namespace: { type: String },
		prodYaml: { type: String },
		preYaml: { type: String },
		prereleaseUrl: { type: String },
		productionUrl: { type: String },
		/**
		 * Deployment YAML
		 */
		deploymentYaml: { type: String },
		/**
		 * Release endpoint URL (development/.../production URL)
		 */
		endpoint: { type: String },
		createdBy: { type: String },
		branch: { type: String },
		/**
		 * @deprecated
		 * Short name of the cloud provider of the cluster to deploy to.
		 */
		provider: { type: String },
		/**
		 * Short name of the targeted cluster to deploy to.
		 */
		cluster: { type: String },
		projectSlug: { type: String },
		appSlug: { type: String },
		providerProjectId: { type: String },
		buildStatus: { type: String },
		status: { type: String },
		startTime: { type: Date },
		endTime: { type: Date },
		duration: { type: Number },
		/**
		 *
		 */
		active: { type: Boolean },
		screenshot: { type: String },
		build: { type: Schema.Types.ObjectId, ref: "builds" },
		app: { type: Schema.Types.ObjectId, ref: "apps" },
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		project: { type: Schema.Types.ObjectId, ref: "projects" },
		workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
	},
	{ collection: "releases", timestamps: true }
);

export const ReleaseModel = model("Release", releaseSchema, "releases");
