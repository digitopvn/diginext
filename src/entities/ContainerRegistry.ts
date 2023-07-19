import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { RegistryProviderType } from "@/interfaces/SystemTypes";
import { registryProviderList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface IContainerRegistry extends IBase {
	name?: string;
	slug?: string;
	isVerified?: boolean;
	/**
	 * Is this a default git provider
	 */
	isDefault?: boolean;

	/**
	 * The host (domain) of your container registry which you are using.
	 * @example
	 * - gcr.io
	 * - asia.gcr.io
	 * - azurecr.io
	 */
	host?: string;

	/**
	 * Organization name in Docker Registry, or Project ID in Google/DigitalOcean Container Registry.
	 */
	organization?: string;

	/**
	 * Base URL of the image, usually is the registry host URI combines with something else.
	 * - This will be used to combine with your project/app image path.
	 * @example
	 * asia.gcr.io/project-id-here
	 */
	imageBaseURL?: string;

	/**
	 * Provider's "shortName"
	 */
	provider?: RegistryProviderType;

	/**
	 * Content of the Service Account credentials ti access services on this cloud provider
	 * - Apply for: Google Cloud, AWS,...
	 * - For example: Kubernetes Clusters, Single Sign-On,...
	 */
	serviceAccount?: string;

	/**
	 * Content of the API access token to use services on this cloud provider
	 * - Apply for: Digital Ocean
	 */
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
	imagePullSecret?: {
		name?: string;
		value?: string;
	};
}
export type ContainerRegistryDto = Omit<IContainerRegistry, keyof HiddenBodyKeys>;

export const containerRegistrySchema = new Schema<IContainerRegistry>(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		isVerified: { type: Boolean },
		isDefault: { type: Boolean, default: false },
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
	},
	{ collection: "container_registries", timestamps: true }
);
