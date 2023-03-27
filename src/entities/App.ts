import { IsNotEmpty } from "class-validator";

import type { DeployEnvironment } from "@/interfaces/DeployEnvironment";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type Project from "./Project";
import type User from "./User";
import type Workspace from "./Workspace";

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

@Entity({ name: "apps" })
export default class App extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `App name is required.` })
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
	@Column()
	image?: string;

	@Column()
	slug?: string;

	@Column()
	createdBy?: string;

	@Column()
	lastUpdatedBy?: string;

	@Column()
	git?: AppGitInfo;

	@Column()
	framework?: {
		name?: string;
		slug?: string;
		repoURL?: string;
		repoSSH?: string;
	};

	/**
	 * @deprecated
	 */
	@Column()
	environment?: {
		[key: string]: DeployEnvironment | string;
	};

	@Column()
	deployEnvironment?: {
		[key: string]: DeployEnvironment;
	};

	@Column()
	latestBuild?: string;

	@Column({ type: "string" })
	projectSlug?: string;

	/**
	 * Owner ID of the app
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * Project ID of the app
	 *
	 * @remarks This can be populated to {Project} data
	 */
	@ObjectIdColumn({ name: "projects" })
	project?: ObjectID | Project | string;

	/**
	 * Workspace ID of the app
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: App) {
		super();
		Object.assign(this, data);
	}
}

export { App };
