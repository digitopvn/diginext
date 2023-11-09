export type StorageUploadOptions = {
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
