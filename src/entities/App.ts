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

/**
 * An interface that extends IBase and describes the properties of an app.
 *
 * @interface IApp
 * @extends {IBase}
 */
export interface IApp extends IBase {
	/**
	 * The name of the app.
	 *
	 * @type {string}
	 * @memberof IApp
	 */
	name?: string;

	/**
	 * OPTIONAL: The image URI of this app on the Container Registry (without `TAG`).
	 *
	 * Combined from: `<registry-image-base-url>/<project-slug>/<app-name-slug>`
	 *
	 * **Don't** specify `tag` at the end! (e.g., `latest`, `beta`,...)
	 *
	 * @type {string}
	 * @memberof IApp
	 * @default <registry-image-base-url>/<project-slug>/<app-name-slug>
	 * @example "asia.gcr.io/my-workspace/my-project/my-app"
	 */
	image?: string;

	/**
	 * The slug of the app.
	 *
	 * @type {string}
	 * @memberof IApp
	 */
	slug?: string;

	/**
	 * The user who created the app.
	 *
	 * @type {string}
	 * @memberof IApp
	 */
	createdBy?: string;

	/**
	 * The user who last updated the app.
	 *
	 * @type {string}
	 * @memberof IApp
	 */
	lastUpdatedBy?: string;

	/**
	 * The Git information of the app.
	 *
	 * @type {AppGitInfo}
	 * @memberof IApp
	 */
	git?: AppGitInfo;

	/**
	 * The framework information of the app.
	 *
	 * @memberof IApp
	 */
	framework?: {
		name?: string;
		slug?: string;
		version?: string;
		repoURL?: string;
		repoSSH?: string;
	};

	/**
	 * The environment information of the app.
	 *
	 * @type {{ [key: string]: DeployEnvironment | string }}
	 * @memberof IApp
	 */
	environment?: { [key: string]: DeployEnvironment | string };

	/**
	 * The deploy environment information of the app.
	 *
	 * @type {{ [key: string]: DeployEnvironment }}
	 * @memberof IApp
	 */
	deployEnvironment?: { [key: string]: DeployEnvironment };

	/**
	 * The latest build of the app.
	 *
	 * @type {string}
	 * @memberof IApp
	 */
	latestBuild?: string;

	/**
	 * The project slug of the app.
	 *
	 * @type {string}
	 * @memberof IApp
	 */
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
			provider: { type: String },
			repoURL: { type: String },
			repoSSH: { type: String },
		},
		framework: {
			name: { type: String },
			slug: { type: String },
			repoURL: { type: String },
			repoSSH: { type: String },
			version: { type: String },
		},
		environment: { type: Map, of: String },
		deployEnvironment: { type: Map },
		latestBuild: { type: String },
		projectSlug: { type: String },
	},
	{ collection: "apps", timestamps: true }
);
