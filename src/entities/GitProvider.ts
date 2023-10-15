import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { availableGitProviders } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export const bitbucketAuthFlow = ["app_password", "oauth_consumer"] as const;
export type BitbucketAuthFlow = (typeof bitbucketAuthFlow)[number];

export const githubAuthFlow = ["personal_access_token", "oauth_app"] as const;
export type GithubAuthFlow = (typeof githubAuthFlow)[number];

export interface BitbucketOAuthOptions {
	/**
	 * The CONSUMER_KEY for Bitbucket authentication:
	 * to create new repo, commit, pull & push changes to the repositories.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	consumer_key?: string;

	/**
	 * The CONSUMER_SECRET for Bitbucket authentication:
	 * to create new repo, commit, pull & push changes to the repositories.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	consumer_secret?: string;

	/**
	 * Your Bitbucket account's username
	 */
	username?: string;

	/**
	 * The APP_PASSWORD for Bitbucket authentication:
	 * to create new repo, commit, pull & push changes to the repositories.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	app_password?: string;

	/**
	 * `TRUE` if the REST API calling was successfully.
	 */
	verified?: boolean;
}

export interface GithubOAuthOptions {
	/**
	 * The app's CLIENT_ID for Github authentication:
	 * to create new repo, commit, pull & push changes to the repositories.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	client_id?: string;

	/**
	 * The app's CLIENT_SECRET for Github authentication:
	 * to create new repo, commit, pull & push changes to the repositories.
	 *
	 * @link https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/about-authentication-with-a-github-app
	 * @type {string}
	 * @memberof IGitProvider
	 */
	client_secret?: string;

	/**
	 * Your Github account's username
	 */
	username?: string;

	/**
	 * The PERSONAL ACCESS TOKEN for Github authentication:
	 * to create new repo, commit, pull & push changes to the repositories.
	 *
	 * @link https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
	 * @type {string}
	 * @memberof IGitProvider
	 */
	personal_access_token?: string;

	/**
	 * `TRUE` if the REST API calling was successfully.
	 */
	verified?: boolean;
}

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
	 * Is this a default git provider
	 */
	isDefault?: boolean;

	/**
	 * The host of the Git provider.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	host?: string;

	/**
	 * The Git workspace (ORG) of the Git provider.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	org?: string;

	/**
	 * Alias of `org` field, will be remove soon.
	 * @deprecated
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
	 * - `TRUE` if the git provider which connected by "Administrator"
	 * - `FALSE` if it was connected by workspace's members and won't be displayed on the dashboard.
	 */
	isOrg?: boolean;

	/**
	 * The type of the Git provider.
	 *
	 * @type {GitProviderType}
	 * @memberof IGitProvider
	 */
	type?: GitProviderType;

	/**
	 * Bitbucket OAuth Information
	 */
	bitbucket_oauth?: BitbucketOAuthOptions;

	/**
	 * Github OAuth Information
	 */
	github_oauth?: GithubOAuthOptions;

	/**
	 * Authorization header method
	 */
	method?: "bearer" | "basic";

	/**
	 * The API access token of the Git provider,
	 * to create new repo, commit, pull & push changes to the repositories.
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	access_token?: string;

	/**
	 * The API refresh token of the Git provider,
	 * to obtain new access token if it's expired
	 *
	 * @type {string}
	 * @memberof IGitProvider
	 */
	refresh_token?: string;

	/**
	 * Verify status, `true` is successfully connected with the git workspace REST API.
	 *
	 * @type {boolean}
	 * @memberof IGitProvider
	 */
	verified?: boolean;
}

export type GitProviderDto = Omit<IGitProvider, keyof HiddenBodyKeys>;

export const gitProviderSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		isDefault: { type: Boolean, default: false },
		host: { type: String },
		org: { type: String },
		gitWorkspace: { type: String },
		repo: {
			url: { type: String },
			sshPrefix: { type: String },
		},
		isOrg: { type: Boolean, default: false },
		type: { type: String, enum: availableGitProviders },
		github_oauth: {
			consumer_key: { type: String },
			consumer_secret: { type: String },
			username: { type: String },
			app_password: { type: String },
			verified: { type: Boolean },
		},
		bitbucket_oauth: {
			client_id: { type: String },
			client_secret: { type: String },
			username: { type: String },
			personal_access_token: { type: String },
			verified: { type: Boolean },
		},
		method: { type: String, enum: ["bearer", "basic"] },
		access_token: { type: String },
		refresh_token: { type: String },
		verified: { type: Boolean },
	},
	{ collection: "git_providers", timestamps: true }
);

export const GitProviderModel = model("GitProvider", gitProviderSchema, "git_providers");
