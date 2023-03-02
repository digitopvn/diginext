// build status
const buildStatusList = ["start", "building", "failed", "success"] as const;
export type BuildStatus = (typeof buildStatusList)[number];

/**
 * @default "letsencrypt"
 */
export type SslIssuer = "letsencrypt" | "custom" | "none";
