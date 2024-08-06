import { isObject } from "lodash";

import type { ICloudStorage } from "@/entities/CloudStorage";
import { cloudStorageSchema } from "@/entities/CloudStorage";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import * as AWSStorage from "@/modules/storages/aws-storage";
import * as GoogleStorage from "@/modules/storages/google-storage";
import { getStorageBucketOrigin } from "@/modules/storages/storage-helper";
import type { StorageUploadOptions } from "@/modules/storages/storage-types";

import BaseService from "./BaseService";

export class CloudStorageService extends BaseService<ICloudStorage> {
	constructor(ownership?: Ownership) {
		super(cloudStorageSchema, ownership);
	}

	async create(data: any, options?: IQueryOptions): Promise<ICloudStorage> {
		// validate
		if (!data.name) throw new Error(`"name" is required.`);
		if (!data.provider) throw new Error(`"provider" is required.`);
		if (!data.bucket) throw new Error(`"bucket" is required.`);
		if (!data.region) throw new Error(`"region" is required.`);
		if (!data.auth || (!data.auth.service_account && !data.auth.key_id && !data.auth.key_secret))
			throw new Error(`Authentication data is required.`);
		if (data.auth.service_account && isObject(data.auth.service_account)) data.auth.service_account = JSON.stringify(data.auth.service_account);

		// generate origin
		data.origin = getStorageBucketOrigin(data);

		// verify
		data.verified = await this.verify(data).catch((e) => {
			console.warn(`Unable to verify this cloud storage due to incorrect authentication info: ${e}`);
			return false;
		});

		// save to db
		let newItem = await super.create(data, options);

		return newItem;
	}

	async update(filter: IQueryFilter<ICloudStorage>, data: any, options?: IQueryOptions): Promise<ICloudStorage[]> {
		// only re-verify if authentication data changed
		if (data.auth) {
			try {
				let items = await this.find(filter, options);
				items = await Promise.all(
					items.map(async (item) => {
						const verified = await this.verify(item);
						const [_item] = await super.update(filter, { ...data, verified }, options);
						return _item;
					})
				);
			} catch (e) {
				console.warn(`Unable to verify this cloud storage due to incorrect authentication info: ${e}`);
			}
		} else {
			let items = await super.update(filter, data, options);
			return items;
		}
	}

	async verify(item: ICloudStorage) {
		// validate
		if (item.provider === "gcloud" && !item.auth?.service_account) throw new Error(`Service Account data not found.`);
		if ((item.provider === "do_space" || item.provider === "aws_s3") && (!item.auth?.key_id || !item.auth?.key_secret))
			throw new Error(`Access key's ID or SECRET not found.`);

		// processing
		try {
			const buckets = item.provider === "gcloud" ? await GoogleStorage.listBuckets(item) : await AWSStorage.listBuckets(item);
			// update db
			// const _item = await this.updateOne({ _id: item._id }, { verified: true });
			// result: updated item
			return true;
		} catch (e) {
			// error
			throw new Error(`Unable to verify storage: ${e}`);
		}
	}

	async uploadFileFromUrl(storage: ICloudStorage, url: string, destFileName: string, options?: StorageUploadOptions) {
		if (storage.provider === "gcloud") {
			return GoogleStorage.uploadFileURL(storage, url, destFileName, options);
		} else {
			return AWSStorage.uploadFileURL(storage, url, destFileName, options);
		}
	}

	async uploadFileFromBuffer(storage: ICloudStorage, buffer: Buffer, destFileName: string, options?: StorageUploadOptions) {
		if (storage.provider === "gcloud") {
			return GoogleStorage.uploadFileBuffer(storage, buffer, destFileName, options);
		} else {
			return AWSStorage.uploadFileBuffer(storage, buffer, destFileName, options);
		}
	}

	async uploadFileFromFilePath(storage: ICloudStorage, filePath: string, destFileName: string, options?: StorageUploadOptions) {
		if (storage.provider === "gcloud") {
			return GoogleStorage.uploadFilePath(storage, filePath, destFileName, options);
		} else {
			return AWSStorage.uploadFilePath(storage, filePath, destFileName, options);
		}
	}
}
