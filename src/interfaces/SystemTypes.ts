import type express from "express";

import type { IRole, IUser, IWorkspace } from "@/entities";

// express.js
export interface AppRequest extends express.Request {
	user?: IUser;
	role?: IRole;
	workspace?: IWorkspace;
}

export interface AppResponse extends express.Response {
	body?: string;
}

// http methods
export const requestMethodList = ["GET", "POST", "PATCH", "DELETE"] as const;
export type RequestMethodType = typeof requestMethodList[number];

// cloud providers
export const cloudProviderList = ["gcloud", "digitalocean", "custom"] as const;
export type CloudProviderType = typeof cloudProviderList[number];

// database providers
export const cloudDatabaseList = ["mongodb", "mysql", "mariadb", "postgresql", "sqlserver", "sqlite", "redis", "dynamodb"] as const;
export type CloudDatabaseType = typeof cloudDatabaseList[number];

// container registry providers
export const registryProviderList = ["gcloud", "digitalocean", "dockerhub"] as const;
export type RegistryProviderType = typeof registryProviderList[number];

// git providers
export const availableGitProviders = ["bitbucket", "github" /**, "gitlab" */] as const;
export type GitProviderType = typeof availableGitProviders[number];

// resource types
export const availableResourceSizes = ["none", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"] as const;
/**
 * Container quota resources
 * @example
 * "none" - {}
 * "1x" - { requests: { cpu: "20m", memory: "128Mi" }, limits: { cpu: "20m", memory: 128Mi" } }
 * "2x" - { requests: { cpu: "40m", memory: "256Mi" }, limits: { cpu: "40m", memory: "256Mi" } }
 * "3x" - { requests: { cpu: "80m", memory: "512Mi" }, limits: { cpu: "80m", memory: "512Mi" } }
 * "4x" - { requests: { cpu: "160m", memory: "1024Mi" }, limits: { cpu: "160m", memory: "1024Mi" } }
 * "5x" - { requests: { cpu: "320m", memory: "2048Mi" }, limits: { cpu: "320m", memory: "2048Mi" } }
 * "6x" - { requests: { cpu: "640m", memory: "4058Mi" }, limits: { cpu: "640m", memory: "4058Mi" } }
 * "7x" - { requests: { cpu: "1280m", memory: "2048Mi" }, limits: { cpu: "1280m", memory: "2048Mi" } }
 * "8x" - { requests: { cpu: "2560m", memory: "8116Mi" }, limits: { cpu: "2560m", memory: "8116Mi" } }
 * "9x" - { requests: { cpu: "5120m", memory: "16232Mi" }, limits: { cpu: "5120m", memory: "16232Mi" } }
 * "10x" - { requests: { cpu: "10024m", memory: "32464Mi" }, limits: { cpu: "10024m", memory: "32464Mi" } }
 */
export type ResourceQuotaSize = typeof availableResourceSizes[number];

// git provider domains
export const gitProviderDomain = {
	bitbucket: "bitbucket.org",
	github: "github.com",
	gitlab: "gitlab.com",
};

// build status
export const buildStatusList = ["start", "building", "failed", "success"] as const;
export type BuildStatus = typeof buildStatusList[number];

/**
 * App status:
 * - `healthy`: App's containers are running well.
 * - `partial_healthy`: Some of the app's containers are unhealthy.
 * - `undeployed`: App has not been deployed yet.
 * - `failed`: App's containers are unable to deploy due to image pull back-off or image pulling errors.
 * - `crashed`: App's containers are facing some unexpected errors.
 * - `unknown`: Other unknown errors.
 */
export const appStatusList = ["healthy", "partial_healthy", "undeployed", "failed", "crashed", "unknown"] as const;
export type AppStatus = typeof appStatusList[number];

/**
 * @default "letsencrypt"
 */
export const sslIssuerList = ["letsencrypt", "custom", "none"] as const;
export type SslIssuer = typeof sslIssuerList[number];

// build platforms
export const buildPlatformList = [
	"linux/arm64",
	"linux/amd64",
	"linux/amd64/v2",
	"linux/riscv64",
	"linux/ppc64le",
	"linux/s390x",
	"linux/386",
	"linux/mips64le",
	"linux/mips64",
	"linux/arm/v7",
	"linux/arm/v6",
] as const;
export type BuildPlatform = typeof buildPlatformList[number];

/**
 * Credential fields
 */
export const credentialFields: string[] = [
	// account
	"token.access_token",
	// clusters & registries
	"apiAccessToken",
	"serviceAccount",
	"dockerPassword",
	"kubeConfig",
	"imagePullSecret.value",
	// git
	"bitbucket_oauth.consumer_secret",
	"bitbucket_oauth.app_password",
	"github_oauth.client_secret",
	"github_oauth.personal_access_token",
	// metadata
	"metadata.email",
	"metadata.apiAccessToken",
	"metadata.serviceAccount",
	"metadata.dockerPassword",
	"metadata.kubeConfig",
];
