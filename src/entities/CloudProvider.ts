import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { CloudProviderType } from "@/interfaces/SystemTypes";
import { cloudProviderList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaOptions } from "./Base";
import type { ICluster } from "./Cluster";

export interface ICloudProvider extends IBase {
	/**
	 * Cloud provider name
	 */
	name?: string;
	/**
	 * Cloud provider short name, without spacing & special characters
	 */
	shortName?: CloudProviderType;
	/**
	 * Content of the API access token to use services on this cloud provider
	 * - Apply for: Digital Ocean
	 */
	apiAccessToken?: string;
	/**
	 * Content of the Service Account credentials ti access services on this cloud provider
	 * - Apply for: Google Cloud, AWS,...
	 * - For example: Kubernetes Clusters, Single Sign-On,...
	 */
	serviceAccount?: string;
	/**
	 * List of available clusters on this provider
	 */
	clusters?: string[] | ICluster[];
}
export type CloudProviderDto = Omit<ICloudProvider, keyof HiddenBodyKeys>;

export const cloudProviderSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String },
	shortName: { type: String, enum: cloudProviderList },
	apiAccessToken: { type: String },
	serviceAccount: { type: String },
	clusters: [{ type: Schema.Types.ObjectId, ref: "clusters" }],
});

export const CloudProviderModel = mongoose.model("CloudProvider", cloudProviderSchema, "cloud_providers");
