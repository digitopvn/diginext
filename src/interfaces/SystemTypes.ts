import type express from "express";

import type BaseController from "@/controllers/BaseController";
import type { IRole, IUser, IWorkspace, RoleRoute } from "@/entities";
import { filterUniqueItems } from "@/plugins/array";

// express.js
export interface AppRequest extends express.Request {
	query: any;
	user?: IUser;
	role?: IRole;
	workspace?: IWorkspace;
	ownership?: Ownership;
	controller?: BaseController;
}

export interface AppResponse extends express.Response {
	body?: string;
}

// ownership
export interface Ownership {
	workspace: IWorkspace;
	owner: IUser;
}

// log type
export const logTypes = ["debug", "warn", "error", "fatal"] as const;
export type LogType = (typeof logTypes)[number];

// data retention
export const retentionTypes = ["limit", "duration"] as const;
export type RetentionType = (typeof retentionTypes)[number];

// http methods
export const requestMethodList = ["GET", "POST", "PATCH", "DELETE"] as const;
export type RequestMethodType = (typeof requestMethodList)[number];

// cloud providers
export const cloudProviderList = ["gcloud", "digitalocean", "custom"] as const;
export type CloudProviderType = (typeof cloudProviderList)[number];

// database providers
export const cloudDatabaseList = ["mongodb", "mysql", "mariadb", "postgresql", "sqlserver", "sqlite", "redis", "dynamodb"] as const;
export type CloudDatabaseType = (typeof cloudDatabaseList)[number];

// container registry providers
export const registryProviderList = ["gcloud", "digitalocean", "dockerhub"] as const;
export type RegistryProviderType = (typeof registryProviderList)[number];

// git providers
export const availableGitProviders = ["bitbucket", "github" /**, "gitlab" */] as const;
export type GitProviderType = (typeof availableGitProviders)[number];

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
export type ResourceQuotaSize = (typeof availableResourceSizes)[number];

// git provider domains
export const gitProviderDomain = {
	bitbucket: "bitbucket.org",
	github: "github.com",
	gitlab: "gitlab.com",
};
export const gitProviderDomainList = ["bitbucket.org", "github.com"] as const;
export type GitProviderDomain = (typeof gitProviderDomainList)[number];

// build status
export const buildStatusList = ["pending", "start", "building", "failed", "success", "cancelled"] as const;
export type BuildStatus = (typeof buildStatusList)[number];

// deploy status
export const deployStatusList = ["pending", "in_progress", "failed", "success", "cancelled"] as const;
export type DeployStatus = (typeof deployStatusList)[number];

// backup status
export const backupStatusList = ["start", "in_progress", "failed", "success", "cancelled"] as const;
export type BackupStatus = (typeof backupStatusList)[number];

// cronjob status
export const cronjobStatusList = ["in_progress", "failed", "success", "cancelled"] as const;
export type CronjobStatus = (typeof cronjobStatusList)[number];

/**
 * App status:
 * - `deploying`: App is being deployed.
 * - `healthy`: App's containers are running well.
 * - `partial_healthy`: Some of the app's containers are unhealthy.
 * - `undeployed`: App has not been deployed yet.
 * - `failed`: App's containers are unable to deploy due to image pull back-off or image pulling errors.
 * - `crashed`: App's containers are facing some unexpected errors.
 * - `unknown`: Other unknown errors.
 */
export const appStatusList = ["deploying", "healthy", "partial_healthy", "undeployed", "failed", "crashed", "unknown"] as const;
export type AppStatus = (typeof appStatusList)[number];

/**
 * @default "letsencrypt"
 */
export const sslIssuerList = ["letsencrypt", "custom", "none"] as const;
export type SslIssuer = (typeof sslIssuerList)[number];

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
export type BuildPlatform = (typeof buildPlatformList)[number];

// system status
// export const systemStatusList = ["incident", "recover"] as const;
// export type SystemStatus = typeof systemStatusList[number];

// webhook events
export const systemEventList = [
	// "system_status",
	"build_status",
	"deploy_status",
	"dbbackup_status",
	"app_status",
	"project_status",
	"environment_status",
] as const;
export type SystemEvent = (typeof systemEventList)[number];

// webhook channels
export const webhookChannelList = ["http_callback", "email", "sms", "web_push", "push_notification", "instant_message"] as const;
export type WebhookChannel = (typeof webhookChannelList)[number];

export const webhookEventStatusList = filterUniqueItems([...buildStatusList, ...deployStatusList, ...backupStatusList, ...appStatusList]);
export type WebhookEventStatus = (typeof webhookEventStatusList)[number];

/**
 * Credential fields
 */
export const credentialFields: string[] = [
	// account
	"token.access_token",
	"owner.password",
	"owner.token.access_token",
	// clusters & registries
	"apiAccessToken",
	"serviceAccount",
	"dockerPassword",
	"kubeConfig",
	"imagePullSecret.value",
	"registry.apiAccessToken",
	"registry.dockerPassword",
	"registry.serviceAccount",
	"registry.imagePullSecret.value",
	// git
	"access_token",
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

/**
 * ROLES & PERMISSIONS: API Routes
 */
export const memberRoleRoutes: RoleRoute[] = [
	{ path: "*", permissions: ["own", "read"], scope: [] },
	{ path: "/api/v1/deploy", permissions: ["read", "create", "update"], scope: [] },
	{ path: "/api/v1/domain", permissions: ["read", "create", "update"], scope: [] },
	{ path: "/api/v1/project", permissions: ["own", "read", "create", "update"], scope: [] },
	{ path: "/api/v1/app", permissions: ["own", "read", "create", "update"], scope: [] },
	{ path: "/api/v1/app/environment", permissions: ["read", "create", "update"], scope: [] },
	{ path: "/api/v1/app/deploy_environment", permissions: ["read", "create", "update"], scope: [] },
	{ path: "/api/v1/app/environment/variables", permissions: ["read", "create", "update"], scope: [] },
	{ path: "/api/v1/build/start", permissions: ["full"], scope: [] },
	{ path: "/api/v1/build/stop", permissions: ["full"], scope: [] },
	{ path: "/api/v1/release", permissions: ["own", "read", "create", "update"], scope: [] },
	{ path: "/api/v1/release/from-build", permissions: ["own", "read", "create", "update"], scope: [] },
	{ path: "/api/v1/release/preview", permissions: ["own", "read", "create", "update"], scope: [] },
	{ path: "/api/v1/git", permissions: ["own", "public"], scope: [] },
	{ path: "/api/v1/git/public-key", permissions: [], scope: [] },
	{ path: "/api/v1/git/ssh/create", permissions: [], scope: [] },
	{ path: "/api/v1/git/ssh/generate", permissions: [], scope: [] },
	{ path: "/api/v1/git/ssh/verify", permissions: [], scope: [] },
	{ path: "/api/v1/user/join-workspace", permissions: ["update"], scope: [] },
	{ path: "/api/v1/role", permissions: ["read"], scope: [] },
	{ path: "/api/v1/api_key", permissions: [], scope: [] },
	{ path: "/api/v1/service_account", permissions: ["own", "public"], scope: [] },
];
export const moderatorRoleRoutes: RoleRoute[] = [{ path: "*", permissions: ["own", "read", "create", "update"], scope: [] }];
export const adminRoleRoutes: RoleRoute[] = [{ path: "*", permissions: ["full"], scope: [] }];
export const guestRoleRoutes: RoleRoute[] = [{ path: "*", permissions: ["own", "create", "update"], scope: [] }];
