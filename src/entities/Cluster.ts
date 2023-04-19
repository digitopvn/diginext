import mongoose, { Schema, Types } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { CloudProviderType } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { ICloudProvider } from "./CloudProvider";

export interface ICluster extends IBase {
	/**
	 * Cluster name
	 */
	name?: string;
	/**
	 * Cluster slug
	 */
	slug?: string;
	/**
	 * Is cluster verified
	 */
	isVerified?: boolean;
	/**
	 * A cluster name on the cloud provider, **NOT** a cluster name in `kubeconfig`
	 */
	shortName?: string;
	/**
	 * Cluster context name (to access via `kubectl context`)
	 */
	contextName?: string;
	/**
	 * Cloud provider of this cluster
	 */
	provider?: string | Types.ObjectId | ICloudProvider;
	/**
	 * Short name of the cloud provider
	 * @example "gcloud", "digitalocean", "custom"
	 */
	providerShortName?: CloudProviderType;
	/**
	 * Cloud zone of this cluster
	 */
	zone?: string;
	/**
	 * Cloud region of this cluster
	 */
	region?: string;
	/**
	 * [GOOGLE ONLY] Project ID of this cluster
	 *
	 * @remarks This is not a project ID of BUILD SERVER database
	 */
	projectID?: string;
	/**
	 * #### `REQUIRES`
	 * ---
	 * The PRIMARY domain of this cluster
	 */
	primaryDomain?: string;
	/**
	 * The PRIMARY IP ADDRESS of this cluster
	 */
	primaryIP?: string;
	/**
	 * Alternative domains or project's domains of this cluster
	 */
	domains?: string[];
	/**
	 * The KUBECONFIG data to access to this cluster
	 */
	kubeConfig?: string;
	/**
	 * Content of the Service Account credentials to access this cluster
	 */
	serviceAccount?: string;
	/**
	 * Content of the API ACCESS TOKEN to access this cluster
	 */
	apiAccessToken?: string;
}
export type ClusterDto = Omit<ICluster, keyof HiddenBodyKeys>;

export const clusterSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		slug: { type: String },
		isVerified: { type: Boolean },
		shortName: { type: String },
		contextName: { type: String },
		provider: { type: Types.ObjectId, ref: "cloud_providers" },
		providerShortName: { type: String },
		zone: { type: String },
		region: { type: String },
		projectID: { type: String },
		primaryDomain: { type: String },
		primaryIP: { type: String },
		domains: [{ type: String }],
		kubeConfig: { type: String },
		serviceAccount: { type: String },
		apiAccessToken: { type: String },
	},
	{ collection: "clusters", timestamps: true }
);

export const ClusterModel = mongoose.model("Cluster", clusterSchema, "clusters");
