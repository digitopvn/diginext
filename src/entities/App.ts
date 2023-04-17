import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { DeployEnvironment } from "@/interfaces/DeployEnvironment";
import type { GitProviderType } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface AppGitInfo {
	/**
	 * `REQUIRES`
	 * ---
	 * A SSH URI of the source code repository
	 * @example git@bitbucket.org:digitopvn/example-repo.git
	 */
	repoSSH: string;
	/**
	 * OPTIONAL
	 * ---
	 * A SSH URI of the source code repository
	 * @example https://bitbucket.org/digitopvn/example-repo
	 */
	repoURL?: string;
	/**
	 * OPTIONAL
	 * ---
	 * Git provider's type: `github`, `bitbucket`, `gitlab`
	 */
	provider?: GitProviderType;
}

export interface IApp extends IBase {
	name?: string;
	/**
	 * OPTIONAL
	 * ---
	 * Image URI of this app on the Container Registry (without `TAG`).
	 * - Combined from: `<registry-image-base-url>/<project-slug>/<app-name-slug>`
	 * - **Don't** specify `tag` at the end! (eg. `latest`, `beta`,...)
	 * @default <registry-image-base-url>/<project-slug>/<app-name-slug>
	 * @example "asia.gcr.io/my-workspace/my-project/my-app"
	 */
	image?: string;
	slug?: string;
	createdBy?: string;
	lastUpdatedBy?: string;
	git?: AppGitInfo;
	framework?: {
		name?: string;
		slug?: string;
		repoURL?: string;
		repoSSH?: string;
	};
	environment?: {
		[key: string]: DeployEnvironment | string;
	};
	deployEnvironment?: {
		[key: string]: DeployEnvironment;
	};
	latestBuild?: string;
	projectSlug?: string;
}
export type AppDto = Omit<IApp, keyof HiddenBodyKeys>;

export const appSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		image: { type: String },
		slug: { type: String },
		createdBy: { type: String },
		lastUpdatedBy: { type: String },
		git: {
			repoURL: { type: String },
			repoSSH: { type: String },
		},
		framework: {
			name: { type: String },
			slug: { type: String },
			repoURL: { type: String },
			repoSSH: { type: String },
		},
		environment: { type: Map, of: String },
		deployEnvironment: { type: Map },
		latestBuild: { type: String },
		projectSlug: { type: String },
	},
	{ collection: "apps", timestamps: true }
);
