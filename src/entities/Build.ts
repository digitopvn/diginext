import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import { type BuildStatus, type DeployStatus, buildStatusList, deployStatusList } from "@/interfaces/SystemTypes";

import type { IApp } from "./App";
import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { IContainerRegistry } from "./ContainerRegistry";

export interface IBuild extends IBase {
	name?: string;
	image?: string;
	/**
	 * Image tag is also "buildTag"
	 */
	tag?: string;
	/**
	 * Build number
	 */
	num?: number;
	/**
	 * Build start time
	 */
	startTime?: Date;
	/**
	 * Build end time
	 */
	endTime?: Date;
	/**
	 * Build duration in miliseconds
	 */
	duration?: number;
	/**
	 * Build for which deploy environment
	 * - **[OPTIONAL] DO NOT rely on this!**
	 * - A build should be able to be used for any deploy environments.
	 */
	env?: string;
	/**
	 * Release revision message
	 */
	message?: string;
	/**
	 * Build from which git branch
	 */
	branch?: string;
	cliVersion?: string;
	createdBy?: string;
	status?: BuildStatus;
	deployStatus?: DeployStatus;
	projectSlug?: string;
	/**
	 * App's slug
	 */
	appSlug?: string;
	logs?: string;
	/**
	 * ID of the container registry
	 * @remarks This can be populated to {IContainerRegistry} data
	 */
	registry?: Types.ObjectId | IContainerRegistry | string;
	/**
	 * ID of the app
	 * @remarks This can be populated to {IApp} data
	 */
	app?: Types.ObjectId | IApp | string;
}
export type BuildDto = Omit<IBuild, keyof HiddenBodyKeys>;

export const buildSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		image: { type: String },
		tag: { type: String },
		num: { type: Number },
		startTime: { type: Date },
		endTime: { type: Date },
		duration: { type: Number },
		message: { type: String },
		env: { type: String },
		branch: { type: String },
		cliVersion: { type: String },
		createdBy: { type: String },
		status: { type: String, enum: buildStatusList },
		deployStatus: { type: String, enum: deployStatusList },
		projectSlug: { type: String },
		appSlug: { type: String },
		logs: { type: String },
		registry: { type: Schema.Types.ObjectId, ref: "container_registries" },
		app: { type: Schema.Types.ObjectId, ref: "apps" },
	},
	{ collection: "builds", timestamps: true }
);

export const BuildModel = mongoose.model("Build", buildSchema, "builds");
