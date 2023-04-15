import { logError } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import { isEmpty } from "lodash";

import type { IApp, IProject, Project } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { getAppConfig, getCurrentGitRepoData, saveAppConfig } from "@/plugins";

import { DB } from "../api/DB";
import { createOrSelectApp } from "../apps/create-or-select-app";
import { createOrSelectProject } from "../apps/create-or-select-project";
import { askForCertIssuer } from "./ask-deploy-environment-info";

export const parseOptionsToAppConfig = async (options: InputOptions) => {
	const {
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
	} = options;

	// get current config
	let appConfig = getAppConfig(targetDirectory);
	if (isEmpty(appConfig)) {
		logError(`No "dx.json" found, please initialize first: $ dx init`);
		return;
	}

	// validate project
	if (typeof projectSlug !== "undefined") {
		let project = await DB.findOne<IProject>("project", { slug: projectSlug });
		if (!project) project = await createOrSelectProject(options);
		appConfig.project = options.projectSlug = projectSlug;
		options.project = project;
	}
	// validate app
	if (typeof slug !== "undefined") {
		let app = await DB.findOne<IApp>("app", { slug }, { populate: ["project", "owner", "workspace"] });
		if (!app) app = await createOrSelectApp((app.project as Project).slug, options);
		appConfig.slug = options.appSlug = slug;
		options.app = app;
	}

	// get remote SSH
	const gitRepoData = await getCurrentGitRepoData(targetDirectory);
	if (!gitRepoData) {
		logError(`This directory doesn't have any initialized git.`);
		return;
	}

	const { remoteSSH, remoteURL, provider: gitProvider, branch } = gitRepoData;

	if (!appConfig.git) appConfig.git = {};
	appConfig.git.provider = gitProvider;
	appConfig.git.repoSSH = remoteSSH;
	appConfig.git.repoURL = remoteURL;

	options.remoteSSH = remoteSSH;
	options.remoteURL = remoteURL;
	options.gitProvider = gitProvider;
	options.gitBranch = branch;

	// validate deploy environment
	if (!appConfig.environment) appConfig.environment = {};
	if (!appConfig.environment[env]) appConfig.environment[env] = {};

	const deployEnvironment = appConfig.environment[env];

	// Google Cloud Info
	if (typeof providerProject !== "undefined") deployEnvironment.project = providerProject;
	if (typeof region !== "undefined") deployEnvironment.region = region;
	if (typeof zone !== "undefined") deployEnvironment.zone = zone;

	// Domains
	if (typeof domain !== "undefined") deployEnvironment.domains = [domain];

	// Kubernetes Info
	if (typeof namespace !== "undefined") deployEnvironment.namespace = namespace;
	if (typeof cluster !== "undefined") deployEnvironment.cluster = cluster;
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
					logError(`There is domains in "dx.json" (${env}).`);
					return;
				}
				const primaryDomain = deployEnvironment.domains[0];
				deployEnvironment.ssl = await askForCertIssuer();
				deployEnvironment.tlsSecret = `tls-secret-${deployEnvironment.ssl}-${makeSlug(primaryDomain)}`;
			} else {
				// if current ssl is "letsencrypt" or "custom"...
				if (isEmpty(deployEnvironment.domains)) {
					logError(
						`There is domains in "dx.json" (${env}) but the SSL was enabled, deploy again without "--ssl" flag or delete "ssl" in "dx.json".`
					);
					return;
				}
				const primaryDomain = deployEnvironment.domains[0];
				deployEnvironment.tlsSecret = `tls-secret-${deployEnvironment.ssl}-${makeSlug(primaryDomain)}`;
			}
		} else {
			deployEnvironment.ssl = "none";
			deployEnvironment.tlsSecret = "";
		}
	}

	appConfig.environment[env] = deployEnvironment;

	appConfig = saveAppConfig(appConfig);

	return appConfig;
};
