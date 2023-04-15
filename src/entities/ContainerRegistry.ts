import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import { registryProviderList, RegistryProviderType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type User from "./User";
import type Workspace from "./Workspace";

export type ContainerRegistryDto = Omit<ContainerRegistry, keyof HiddenBodyKeys>;

export interface IContainerRegistry extends IBase {
	name?: string;
	slug?: string;
	isVerified?: boolean;
	host?: string;
	organization?: string;
	imageBaseURL?: string;
	provider?: RegistryProviderType;
	serviceAccount?: string;
	apiAccessToken?: string;
	dockerServer?: string;
	dockerEmail?: string;
	dockerUsername?: string;
	dockerPassword?: string;
	imagePullSecret?: {
		name?: string;
		value?: string;
	};
}

export const containerRegistrySchema = new Schema({
	...baseSchemaOptions,
	name: { type: String },
	slug: { type: String },
	isVerified: { type: Boolean },
	host: { type: String },
	organization: { type: String },
	imageBaseURL: { type: String },
	provider: { type: String, enum: registryProviderList },
	serviceAccount: { type: String },
	apiAccessToken: { type: String },
	dockerServer: { type: String },
	dockerEmail: { type: String },
	dockerUsername: { type: String },
	dockerPassword: { type: String },
	imagePullSecret: {
		name: { type: String },
		value: { type: String },
	},
});

export const ContainerRegistryModel = mongoose.model("ContainerRegistry", containerRegistrySchema, "container_registries");

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
	 * Organization name in Docker Registry, or Project ID in Google/DigitalOcean Container Registry.
	 */
	@Column()
	organization?: string;

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
