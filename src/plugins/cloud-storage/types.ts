const CLOUD_STORAGE_PROVIDERS = ["cloudflare", "aws_s3", "do_space", "google"] as const;
export type CloudStorageProvider = (typeof CLOUD_STORAGE_PROVIDERS)[number];

export type ICloudStorage = {
	provider: CloudStorageProvider;
	bucket: string;
	region: string;
	endpoint?: string;
	baseUrl?: string;
	basePath?: string;
	accessKey: string;
	secretKey: string;
};

export type StorageUploadOptions = {
	storage?: ICloudStorage;
	debug?: boolean;

	/**
	 * CDN domain
	 */
	storageHost?: string;
	/**
	 * Examples: "gzip"
	 */
	contentEncoding?: string;
	/**
	 * Example: "public, max-age=31536000"
	 */
	cacheControl?: string;
};
