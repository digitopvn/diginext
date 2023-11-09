// eslint-disable-next-line import/no-extraneous-dependencies
import type { Bucket } from "@google-cloud/storage";
import { Storage } from "@google-cloud/storage";

import type { ICloudStorage } from "@/entities";
import { getImageBufferFromUrl, readFileToBuffer } from "@/plugins/image";

import type { StorageUploadOptions } from "./storage-types";

export type GoogleStorageBucket = Bucket & { pathPrefix: string };

export type InitGoogleStorageOptions = { isDebugging?: boolean };

export function initStorageByServiceAccount(serviceAccount: string, bucketName: string, options?: InitGoogleStorageOptions) {
	if (!serviceAccount) throw new Error(`Service Account data is required.`);

	// console.log("env.GOOGLE_SERVICE_ACCOUNT :>> ", env.GOOGLE_SERVICE_ACCOUNT);
	// console.log("env.GOOGLE_SERVICE_ACCOUNT.replace() :>> ", env.GOOGLE_SERVICE_ACCOUNT?.replace(/\\n/g, "\n"));
	const googleSA = JSON.parse(serviceAccount);
	// console.log("googleSA :>> ", googleSA);
	// console.log("googleSA.project_id :>> ", googleSA.project_id);

	const storage = new Storage({
		projectId: googleSA.project_id,
		credentials: googleSA,
	});

	const bucket = storage.bucket(bucketName) as GoogleStorageBucket;
	return bucket;
}

export function initStorage(storage: ICloudStorage, options?: InitGoogleStorageOptions) {
	return initStorageByServiceAccount(storage.auth?.service_account, storage.bucket, options);
}

export async function listBuckets(storage: ICloudStorage) {
	const googleSA = JSON.parse(storage.auth?.service_account);
	const _storage = new Storage({
		projectId: googleSA.project_id,
		credentials: googleSA,
	});
	const buckets = await _storage.getBuckets();
	console.log("google storage > buckets :>> ", buckets);
	return buckets;
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
	// initialize storage bucket
	const bucket = initStorage(storage);
	const file = bucket.file(destFileName);

	return new Promise((resolve, reject) => {
		try {
			// Create a writable stream and specify the format of the data to be written
			const stream = file.createWriteStream({
				resumable: false,
				gzip: options?.contentEncoding === "gzip",
				metadata: {
					contentType: "application/octet-stream", // or whichever content type your buffer should be
					cacheControl: options?.cacheControl,
				},
			});

			stream.on("error", (err) => {
				reject(err);
			});

			stream.on("finish", () => {
				resolve({
					path: destFileName,
					storageUrl: getUploadFileStorageUrl(bucket.name, destFileName),
					publicUrl: options?.storageHost
						? getUploadFilePublicUrl(options?.storageHost, destFileName)
						: getUploadFileStorageUrl(bucket.name, destFileName),
				});
			});

			// Write the buffer to the file
			stream.end(buffer);
		} catch (err) {
			reject(err);
		}
	});
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
