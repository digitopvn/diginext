import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { availableGitProviders } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaOptions } from "./Base";
import type { IGitProvider } from "./GitProvider";

export type FrameworkDto = Omit<IFramework, keyof HiddenBodyKeys>;

export interface IFramework extends IBase {
	name?: string;
	host?: string;
	/**
	 * Type of the Git Provider
	 */
	gitProvider?: GitProviderType;
	/**
	 * Git repository access privacy
	 */
	isPrivate?: boolean;
	/**
	 * ID of the Git Provider
	 * @remarks This can be populated to {GitProvider} data
	 */
	git?: Types.ObjectId | IGitProvider;
	repoURL?: string;
	repoSSH?: string;
	mainBranch?: string;
	/**
	 * Number of downloads
	 */
	downloads?: number;
}

export const frameworkSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String },
	host: { type: String },
	gitProvider: { type: String, enum: availableGitProviders },
	isPrivate: { type: Boolean },
	git: { type: Schema.Types.ObjectId, ref: "git_providers" },
	repoURL: { type: String },
	repoSSH: { type: String },
	mainBranch: { type: String },
	downloads: { type: Number },
});

export const FrameworkModel = mongoose.model("frameworks", frameworkSchema, "frameworks");
