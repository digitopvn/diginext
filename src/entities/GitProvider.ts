import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { availableGitProviders } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

/**
 * An interface that extends IBase and describes the properties of a Git provider.
 *
 * @interface IGitProvider
 * @extends {IBase}
 */
export interface IGitProvider extends IBase {
	/**
	 * The name of the Git provider.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	name?: string;

	/**
	 * The host of the Git provider.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	host?: string;

	/**
	 * The Git workspace of the Git provider.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	gitWorkspace?: string;

	/**
	 * The repository of the Git provider.
	 *
	 * @type {{
	 *     url?: string;
	 *     sshPrefix?: string;
	 *   }}
	 * @memberof IGitProvider
	 */
	repo?: {
		/**
		 * The URL of the repository of the Git provider.
		 *
		 * @type {string}
		 */
		url?: string;

		/**
		 * The SSH prefix of the repository of the Git provider.
		 *
		 * @type {string}
		 */
		sshPrefix?: string;
	};

	/**
	 * The type of the Git provider.
	 *
	 * @type {GitProviderType}
	 * @memberof IGitProvider
	 */
	type?: GitProviderType;
}

export type GitProviderDto = Omit<IGitProvider, keyof HiddenBodyKeys>;

export const gitProviderSchema = new Schema<IGitProvider>(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		host: { type: String },
		gitWorkspace: { type: String },
		repo: {
			url: { type: String },
			sshPrefix: { type: String },
		},
		type: { type: String, enum: availableGitProviders },
	},
	{ collection: "git_providers", timestamps: true }
);

export const GitProviderModel = model<IGitProvider>("GitProvider", gitProviderSchema, "git_providers");
