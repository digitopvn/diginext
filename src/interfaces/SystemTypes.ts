// cloud providers
export const cloudProviderList = ["gcloud", "digitalocean", "custom"] as const;
export type CloudProviderType = (typeof cloudProviderList)[number];

// container registry providers
export const registryProviderList = ["gcloud", "digitalocean", "dockerhub"] as const;
export type RegistryProviderType = (typeof registryProviderList)[number];

// git providers
export const availableGitProviders = ["bitbucket", "github", "gitlab"] as const;
export type GitProviderType = (typeof availableGitProviders)[number];

export const gitProviderDomain = {
	bitbucket: "bitbucket.org",
	github: "github.com",
	gitlab: "gitlab.com",
};

// build status
export const buildStatusList = ["start", "building", "failed", "success"] as const;
export type BuildStatus = (typeof buildStatusList)[number];

/**
 * @default "letsencrypt"
 */
export const sslIssuerList = ["letsencrypt", "custom", "none"] as const;
export type SslIssuer = (typeof sslIssuerList)[number];
