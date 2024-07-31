import { logError } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

import type { InputOptions } from "@/interfaces";
import { getCurrentGitRepoData } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

import { getAppConfigFromApp } from "../apps/app-helper";
import { askForProjectAndApp } from "../apps/ask-project-and-app";
import { updateAppConfig } from "../apps/update-config";
import { askForDomain } from "../build";
import { askForCluster } from "../cluster/ask-for-cluster";
import { askForRegistry } from "../registry/ask-for-registry";
import { askForCertIssuer } from "./ask-deploy-environment-info";

export const parseOptionsToAppConfig = async (options: InputOptions) => {
	const {
		author,
		env,
		targetDirectory,
		slug,
		projectSlug,
		namespace,
		cluster,
		domain,
		port,
		shouldEnableCDN: cdn,
		shouldInherit,
		redirect,
		replicas,
		size,
		ssl,
		providerProject,
		region,
		zone,
		registry,
		isDebugging = false,
	} = options;

	const { app, project } = await askForProjectAndApp(options.targetDirectory, options);
	// console.log("app :>> ", app);
	// console.log("project :>> ", project);

	// get current config
	let appConfig = await getAppConfigFromApp(app);
	if (isEmpty(appConfig)) {
		logError(`No app configurations found, please initialize first: $ dx init`);
		return;
	}

	appConfig.project = project.slug;

	// get remote SSH
	const gitRepoData = await getCurrentGitRepoData(targetDirectory);
	if (!gitRepoData) {
		logError(`This directory doesn't have any initialized git.`);
		return;
	}

	const { repoSSH, repoURL, provider: gitProvider, branch } = gitRepoData;

	if (!appConfig.git) appConfig.git = {};
	appConfig.git.provider = gitProvider;
	appConfig.git.repoSSH = repoSSH;
	appConfig.git.repoURL = repoURL;

	options.repoSSH = repoSSH;
	options.repoURL = repoURL;
	options.gitProvider = gitProvider;
	options.gitBranch = branch;

	// validate deploy environment
	if (!appConfig.deployEnvironment) appConfig.deployEnvironment = {};
	if (!appConfig.deployEnvironment[env]) appConfig.deployEnvironment[env] = {};

	const deployEnvironment = appConfig.deployEnvironment[env];

	// Google Cloud Info
	if (typeof providerProject !== "undefined") deployEnvironment.project = providerProject;
	if (typeof region !== "undefined") deployEnvironment.region = region;
	if (typeof zone !== "undefined") deployEnvironment.zone = zone;

	// Container Registry
	if (typeof registry !== "undefined") deployEnvironment.registry = typeof registry !== "boolean" ? registry : (await askForRegistry()).slug;

	// Domains
	if (typeof domain !== "undefined" && typeof domain !== "boolean") deployEnvironment.domains = [domain];

	// Kubernetes Info
	if (typeof namespace !== "undefined") deployEnvironment.namespace = namespace;
	if (typeof cluster !== "undefined") deployEnvironment.cluster = typeof cluster !== "boolean" ? cluster : (await askForCluster()).slug;
	if (typeof port !== "undefined") deployEnvironment.port = port;
	if (typeof cdn !== "undefined") deployEnvironment.cdn = cdn;
	if (typeof shouldInherit !== "undefined") deployEnvironment.shouldInherit = shouldInherit;
	if (typeof redirect !== "undefined") deployEnvironment.redirect = redirect;
	if (typeof replicas !== "undefined") deployEnvironment.replicas = replicas;
	if (typeof size !== "undefined") deployEnvironment.size = size;
	if (typeof ssl !== "undefined") {
		if (ssl) {
			if (typeof deployEnvironment.ssl === "undefined" || deployEnvironment.ssl === "none") {
				if (isEmpty(deployEnvironment.domains)) {
					// generate one or ask to generate one!
					const domains = await askForDomain(env, project.slug, app.slug, deployEnvironment, {
						user: author,
						shouldGenerate: domain == true,
					});
					if (isEmpty(domains)) {
						logError(`No domains to issue SSL certificate.`);
						return;
					}
					deployEnvironment.domains = domains;
				}
				const primaryDomain = deployEnvironment.domains[0];
				deployEnvironment.ssl = domain == true ? "letsencrypt" : await askForCertIssuer();
				deployEnvironment.tlsSecret = `tls-secret-${deployEnvironment.ssl}-${makeSlug(primaryDomain)}`;
			} else {
				// if current ssl is "letsencrypt" or "custom"...
				if (isEmpty(deployEnvironment.domains)) {
					if (domain == true) {
						deployEnvironment.domains = await askForDomain(env, project.slug, app.slug, deployEnvironment, { shouldGenerate: true });
						deployEnvironment.ssl = "letsencrypt";
					} else {
						logError(
							`There is domains in deploy environment config (${env}) but the SSL was enabled, deploy again without "--ssl" flag or delete "ssl" in deploy environment config on Diginext workspace.`
						);
						return;
					}
				}
				const primaryDomain = deployEnvironment.domains[0];
				deployEnvironment.tlsSecret = `tls-secret-${deployEnvironment.ssl}-${makeSlug(primaryDomain)}`;
			}
		} else {
			deployEnvironment.ssl = "none";
			deployEnvironment.tlsSecret = "";
		}
	}

	if (isDebugging) console.log("parseOptionsToAppConfig() > deployEnvironment :>> ", deployEnvironment);

	appConfig.deployEnvironment[env] = deployEnvironment;

	// save to app config on server
	appConfig = await updateAppConfig(app, env, deployEnvironment);
	return appConfig;
};
