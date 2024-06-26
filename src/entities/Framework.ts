import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { availableGitProviders } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { IGitProvider } from "./GitProvider";

export type FrameworkDto = Omit<IFramework, keyof HiddenBodyKeys>;

/**
 * An interface that extends IBase and describes the properties of a framework.
 *
 * @interface IFramework
 * @extends {IBase}
 */
export interface IFramework extends IBase {
	name?: string;
	host?: string;
	/**
	 * Type of the Git Provider
	 */
	gitProvider?: GitProviderType;
	/**
	 * Git repository access privacy
	 * @deprecated
	 */
	isPrivate?: boolean;
	/**
	 * ID of the Git Provider
	 * @remarks This can be populated to {GitProvider} data
	 */
	git?: Types.ObjectId | IGitProvider;

	/**
	 * The repository URL of the framework.
	 *
	 * @type {string}
	 * @memberof IFramework
	 */
	repoURL?: string;

	/**
	 * The SSH URL of the framework.
	 *
	 * @type {string}
	 * @memberof IFramework
	 */
	repoSSH?: string;

	/**
	 * The main branch of the framework.
	 *
	 * @type {string}
	 * @memberof IFramework
	 */
	mainBranch?: string;

	/**
	 * The number of downloads for the framework.
	 *
	 * @type {number}
	 * @memberof IFramework
	 */
	downloads?: number;
}

export const frameworkSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		host: { type: String },
		gitProvider: { type: String, enum: availableGitProviders },
		isPrivate: { type: Boolean },
		git: { type: Schema.Types.ObjectId, ref: "git_providers" },
		repoURL: { type: String },
		repoSSH: { type: String },
		mainBranch: { type: String },
		downloads: { type: Number },
	},
	{ collection: "frameworks", timestamps: true }
);

export const FrameworkModel = mongoose.model("frameworks", frameworkSchema, "frameworks");
