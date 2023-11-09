import type { ICloudStorage } from "@/entities";

export function getStorageBucketOrigin(data: ICloudStorage) {
	return data.provider === "do_space"
		? `https://${data.bucket}.${data.region}.digitaloceanspaces.com`
		: data.provider === "aws_s3"
		? `https://${data.bucket}.s3.${data.region}.amazonaws.com`
		: `https://storage.googleapis.com/${data.bucket}`;
}

export function getStorageHost(data: ICloudStorage) {
	return data.provider === "do_space"
		? `${data.region}.digitaloceanspaces.com`
		: data.provider === "aws_s3"
		? `s3.${data.region}.amazonaws.com`
		: `storage.googleapis.com`;
}
