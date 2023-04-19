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
export const availableGitProviders = ["bitbucket", "github", "gitlab"] as const;
export type GitProviderType = typeof availableGitProviders[number];

// resource types
export const availableResourceSizes = ["none", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"] as const;
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
