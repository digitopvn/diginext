import type { HiddenBodyKeys } from "@/interfaces";
import { RegistryProviderType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type User from "./User";
import type Workspace from "./Workspace";

export type ContainerRegistryDto = Omit<ContainerRegistry, keyof HiddenBodyKeys>;

@Entity({ name: "container_registries" })
export default class ContainerRegistry extends Base {
	@Column()
	name?: string;

	@Column()
	slug?: string;

	@Column()
	isVerified?: boolean;

	/**
	 * The host (domain) of your container registry which you are using.
	 * @example
	 * - gcr.io
	 * - asia.gcr.io
	 * - azurecr.io
	 */
	@Column()
	host?: string;

	/**
	 * Base URL of the image, usually is the registry host URI combines with something else.
	 * - This will be used to combine with your project/app image path.
	 * @example
	 * asia.gcr.io/project-id-here
	 */
	@Column()
	imageBaseURL?: string;

	/**
	 * Provider's "shortName"
	 */
	@Column()
	provider?: RegistryProviderType;

	/**
	 * Content of the Service Account credentials ti access services on this cloud provider
	 * - Apply for: Google Cloud, AWS,...
	 * - For example: Kubernetes Clusters, Single Sign-On,...
	 */
	@Column()
	serviceAccount?: string;

	/**
	 * Content of the API access token to use services on this cloud provider
	 * - Apply for: Digital Ocean
	 */
	@Column()
	apiAccessToken?: string;

	/**
	 * `[For Docker Registry]` Docker registry server
	 * @default https://index.docker.io/v1/
	 */
	dockerServer?: string;

	/**
	 * `[For Docker Registry]` Docker email
	 */
	dockerEmail?: string;

	/**
	 * `[For Docker Registry]` Docker username
	 */
	dockerUsername?: string;

	/**
	 * `[For Docker Registry]` Docker password
	 */
	dockerPassword?: string;

	@Column()
	imagePullSecret?: {
		name?: string;
		value?: string;
	};

	/**
	 * User ID of the owner
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: ContainerRegistry) {
		super();
		Object.assign(this, data);
	}
}

export { ContainerRegistry };
