/* eslint-disable prettier/prettier */
import type { ICloudStorage } from "./types";

/**
 * Private access URL for the storage bucket
 * @param storage
 * @returns
 */
export function getStorageBucketOrigin(storage: ICloudStorage) {
  return storage.provider === "do_space"
    ? `https://${storage.bucket}.${storage.region}.digitaloceanspaces.com`
    : storage.provider === "aws_s3"
      ? `https://${storage.bucket}.s3.${storage.region}.amazonaws.com`
      : storage.provider === "cloudflare"
        ? storage.endpoint
        : `https://storage.googleapis.com/${storage.bucket}`;
}

/**
 * Public access host (domain) for the storage bucket
 * @param storage
 * @returns
 */
export function getStorageHost(storage: ICloudStorage) {
  // cloudflare "baseUrl" is required
  if (storage.baseUrl) return storage.baseUrl.replace(/https?:\/\//, "");

  return storage.provider === "do_space"
    ? `${storage.region}.digitaloceanspaces.com`
    : storage.provider === "aws_s3"
      ? `s3.${storage.region}.amazonaws.com`
      : `storage.googleapis.com`;
}

/**
 * Get the origin URL for the uploaded file (private access)
 * @param storage
 * @param destFileName
 * @returns
 */
export function getUploadFileOriginEndpointUrl(storage: ICloudStorage, destFileName: string) {
  return `${getStorageBucketOrigin(storage)}${
    storage.basePath && !storage.basePath.startsWith("/")
      ? `/${storage.basePath}`
      : storage.basePath
  }/${destFileName.startsWith("/") ? destFileName.slice(1) : destFileName}`;
}

/**
 * Get the public URL for the uploaded file
 * @param storage
 * @param destFileName
 * @returns
 */
export function getUploadFilePublicUrl(storage: ICloudStorage, destFileName: string) {
  return storage.provider === "cloudflare"
    ? `https://${getStorageHost(storage)}${
        storage.basePath && !storage.basePath.startsWith("/")
          ? `/${storage.basePath}`
          : storage.basePath
      }/${destFileName.startsWith("/") ? destFileName.slice(1) : destFileName}`
    : `https://${storage.bucket}.${getStorageHost(storage)}${
        storage.basePath && !storage.basePath.startsWith("/")
          ? `/${storage.basePath}`
          : storage.basePath
      }/${destFileName.startsWith("/") ? destFileName.slice(1) : destFileName}`;
}

export function guessMimeTypeByBuffer(buffer: Buffer): string {
  const fileSignature = buffer.subarray(0, 12).toString("hex").toUpperCase();

  if (fileSignature.startsWith("89504E47")) return "image/png";
  if (fileSignature.startsWith("FFD8FF")) return "image/jpeg";
  if (fileSignature.startsWith("474946")) return "image/gif";
  if (fileSignature.startsWith("52494646") && fileSignature.slice(16, 24) === "57454250")
    return "image/webp";
  if (fileSignature.startsWith("424D")) return "image/bmp";
  if (fileSignature.startsWith("49492A00") || fileSignature.startsWith("4D4D002A"))
    return "image/tiff";

  if (fileSignature.startsWith("000001B3") || fileSignature.startsWith("000001BA"))
    return "video/mpeg";
  if (fileSignature.startsWith("2321414D52")) return "audio/amr";
  if (fileSignature.startsWith("25504446")) return "application/pdf";
  if (fileSignature.startsWith("504B0304")) return "application/zip";

  // More accurate checks for MP4 and QuickTime
  if (fileSignature.slice(8, 16) === "66747970") {
    const subtype = fileSignature.slice(16, 24);
    if (["69736F6D", "6D703431", "6D703432"].includes(subtype)) return "video/mp4";
    if (subtype === "71742020") return "video/quicktime";
  }

  if (fileSignature.startsWith("1A45DFA3")) return "video/webm";

  return "application/octet-stream"; // Default to binary data if unknown
}
