import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { S3 } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import AWS from "aws-sdk";

import type { ICloudStorage } from "@/entities";
import { getImageBufferFromUrl, readFileToBuffer } from "@/plugins/image";

import { getStorageHost } from "./storage-helper";
import type { StorageUploadOptions } from "./storage-types";

export type InitGoogleStorageOptions = { pathPrefix?: string; isDebugging?: boolean };

export function initStorage(storage: ICloudStorage) {
	// Configure the AWS SDK with your AWS credentials
	// JS SDK v3 does not support global configuration.
	// Codemod has attempted to pass values to each service client in this file.
	// You may need to update clients outside of this file, if they use global config.
	// AWS.config.update({
	// 	accessKeyId: storage.auth.key_id, // Replace with your AWS access key
	// 	secretAccessKey: storage.auth.key_secret, // Replace with your AWS secret key
	// 	region: storage.region, // Uncomment and set to your bucket's region
	// });

	const endpoint = storage.provider === "do_space" ? new AWS.Endpoint(getStorageHost(storage)) : undefined;

	const s3 = new S3({
		endpoint,
		credentials: {
			accessKeyId: storage.auth.key_id,
			secretAccessKey: storage.auth.key_secret,
		},
		region: storage.region,
	});

	return s3;
}

export async function listBuckets(storage: ICloudStorage) {
	const s3 = initStorage(storage);

	const response = await s3.listBuckets({});

	return response.Buckets;
}

export function getUploadFileStorageUrl(bucketName: string, destFileName: string) {
	return `https://storage.googleapis.com/${bucketName}/${destFileName}`;
}

export function getUploadFilePublicUrl(storageHost: string, destFileName: string) {
	return `https://${storageHost}/${destFileName}`;
}

export async function uploadFileBuffer(
	storage: ICloudStorage,
	buffer: Buffer,
	destFileName: string,
	options?: StorageUploadOptions
): Promise<{ path: string; storageUrl: string; publicUrl: string }> {
	const s3 = initStorage(storage);

	const uploadParams: PutObjectCommandInput = {
		Bucket: storage.bucket,
		Key: destFileName,
		Body: buffer,
		ContentEncoding: options?.contentEncoding, // Set file to be gzip-encoded
		CacheControl: options?.cacheControl, // Set cache-control headers
	};

	await new Upload({
		client: s3,
		params: uploadParams,
	}).done();

	return {
		path: destFileName,
		storageUrl: getUploadFileStorageUrl(storage.bucket, destFileName),
		publicUrl: options?.storageHost
			? getUploadFilePublicUrl(options?.storageHost, destFileName)
			: getUploadFileStorageUrl(storage.bucket, destFileName),
	};
}

export async function uploadFileURL(storage: ICloudStorage, url: string, destFileName: string, options?: StorageUploadOptions) {
	const buffer = await getImageBufferFromUrl(url);
	if (!buffer) throw new Error(`Unable to get image buffer from "${url}"`);
	return uploadFileBuffer(storage, buffer, destFileName, options);
}

export async function uploadFilePath(storage: ICloudStorage, filePath: string, destFileName: string, options?: StorageUploadOptions) {
	const buffer = readFileToBuffer(filePath);
	if (!buffer) throw new Error(`Unable to get image buffer from "${filePath}"`);
	return uploadFileBuffer(storage, buffer, destFileName, options);
}
