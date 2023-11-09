import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { StorageProviderType } from "@/interfaces/SystemTypes";
import { storageProviderList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface ICloudStorage extends IBase {
	name?: string;
	verified?: boolean;
	provider?: StorageProviderType;
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
		 * ### NOTE: For AWS S3 & DigitalOcean Space Storage
		 * Your AWS access key ID
		 */
		key_id?: string;
		/**
		 * ### NOTE: For AWS S3 & DigitalOcean Space Storage
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
		provider: { type: String, enum: storageProviderList },
		host: { type: String },
		origin: { type: String },
		bucket: { type: String },
		region: { type: String },
		auth: {
			service_account: { type: String },
			key_id: { type: String },
			key_secret: { type: String },
		},
	},
	{ collection: "cloud_storages", timestamps: true }
);

export const CloudStorageModel = mongoose.model("CloudStorage", cloudStorageSchema, "cloud_storages");
