import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { CloudProviderType } from "@/interfaces/SystemTypes";
import { cloudProviderList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface ICloudStorage extends IBase {
	name?: string;
	verified?: boolean;
	provider?: CloudProviderType;
	/**
	 * The host (domain) of your cloud storage.
	 * @example "cdn.example.com"
	 */
	host?: string;
	/**
	 * Storage origin URL
	 * @example "https://storage.googleapis.com/<project-id>"
	 */
	origin?: string;
	/**
	 * Bucket name
	 */
	bucket?: string;
	/**
	 * Storage region
	 */
	region?: string;
	/**
	 * Authentication
	 */
	auth?: {
		/**
		 * ### NOTE: For Google Cloud Storage
		 * JSON string containing "client_email" and "private_key" properties, or the external account client options.
		 */
		service_account?: string;
		/**
		 * ### NOTE: For AWS S3 Storage
		 * Your AWS access key ID
		 */
		key_id?: string;
		/**
		 * ### NOTE: For AWS S3 Storage
		 * Your AWS secret access key
		 */
		key_secret?: string;
	};
}
export type CloudStorageDto = Omit<ICloudStorage, keyof HiddenBodyKeys>;

export const cloudStorageSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		verified: Boolean,
		provider: { type: String, enum: cloudProviderList },
		host: { type: String },
		origin: { type: String },
		bucket: { type: String },
	},
	{ collection: "cloud_storages", timestamps: true }
);

export const CloudStorageModel = mongoose.model("CloudStorage", cloudStorageSchema, "cloud_storages");
