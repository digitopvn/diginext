import axios from "axios";
import { randomStringByLength } from "diginext-utils/dist/string/random";
import { upperCase } from "lodash";

import type { IRole } from "@/entities";
import type { IGitProvider } from "@/entities/GitProvider";
import { gitProviderSchema } from "@/entities/GitProvider";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import { type Ownership, gitProviderDomain } from "@/interfaces/SystemTypes";
import GitProviderAPI from "@/modules/git/git-provider-api";
import { makeSlug } from "@/plugins/slug";
import { checkPermissionsByFilter } from "@/plugins/user-utils";

import BaseService from "./BaseService";

export class GitProviderService extends BaseService<IGitProvider> {
	constructor(ownership?: Ownership) {
		super(gitProviderSchema, ownership);
	}

	async create(data: any, options?: IQueryOptions): Promise<IGitProvider> {
		// validation
		const { type, name, bitbucket_oauth, github_oauth } = data;

		// if (!name) throw new Error(`Git provider name is required.`);
		if (!type) throw new Error(`Git provider type is required.`);

		let access_token: string, refresh_token: string, method: "bearer" | "basic";

		if (type === "bitbucket") {
			if (!bitbucket_oauth) throw new Error(`Bitbucket OAuth information is required.`);

			if (!bitbucket_oauth.consumer_key && !bitbucket_oauth.consumer_secret) {
				// check app passwords
				if (!bitbucket_oauth.app_password || !bitbucket_oauth.username) throw new Error(`Bitbucket username & app password are required.`);

				access_token = Buffer.from(`${bitbucket_oauth.username}:${bitbucket_oauth.app_password}`, "utf8").toString("base64");
				method = "basic";
			} else if (!bitbucket_oauth.app_password) {
				// check OAuth consumer
				if (!bitbucket_oauth.consumer_key || !bitbucket_oauth.consumer_secret)
					throw new Error(`Bitbucket OAuth consumer key & secret are required.`);

				// generate access_token & refresh_token
				try {
					const digested = Buffer.from(`${bitbucket_oauth.consumer_key}:${bitbucket_oauth.consumer_secret}`, "utf8").toString("base64");
					const generateResponse = await axios.post(
						`https://bitbucket.org/site/oauth2/access_token`,
						{
							grant_type: "client_credentials",
						},
						{ headers: { authorization: `Basic ${digested}` } }
					);
					const resData = JSON.parse(generateResponse.data);

					access_token = resData.access_token;
					refresh_token = resData.refresh_token;
					method = "bearer";
				} catch (e) {
					throw new Error(e.toString());
				}
			} else {
				throw new Error(`Bitbucket OAuth information (OAuth consumer or app password) is required.`);
			}
			if (!data.name) data.name = "Bitbucket";
		} else if (type === "github") {
			if (!github_oauth) throw new Error(`Github OAuth information is required.`);

			if (!github_oauth.client_id && !github_oauth.client_secret) {
				// if (!name) throw new Error(`Git provider name is required.`);
				// check personal access token
				if (!github_oauth.personal_access_token) throw new Error(`Github Personal access token is required.`);

				access_token = github_oauth.personal_access_token;
				method = "bearer";
			} else if (!github_oauth.personal_access_token) {
				// check OAuth app (client_id & client_secret)
				if (!github_oauth.client_id || !github_oauth.client_secret)
					throw new Error(`Github OAuth App's CLIENT_ID & CLIENT_SECRET are required.`);

				// access_token will be processed via client browser and automatically saved after that
				method = "bearer";
			} else {
				throw new Error(`Github OAuth information (OAuth App or Personal Access Token) is required.`);
			}

			// auto generated fields
			if (!data.name) data.name = "Github";
		} else {
			throw new Error(`Git "${type}" type is not supported yet.`);
		}

		// Fallback support "gitWorkspace" === "org" -> will be removed soon
		if (data.org) data.gitWorkspace = data.org;
		if (data.gitWorkspace) data.org = data.gitWorkspace;

		// generate repo info
		data.host = gitProviderDomain[data.type];

		// grab data to create:
		data.access_token = access_token;
		data.refresh_token = refresh_token;
		data.method = method;

		// mark as organization git provider or not
		data.public = data.isOrg = (this.user.activeRole as IRole).type === "admin";

		// verify connection
		data.verified = await this.verify(data, options);

		// save
		return super.create(data);
	}

	async find(
		filter?: IQueryFilter<IGitProvider>,
		options?: IQueryOptions & IQueryPagination,
		pagination?: IQueryPagination
	): Promise<IGitProvider[]> {
		// check access permissions
		if (this.user?.allowAccess?.gits?.length > 0) filter = { $or: [filter, { _id: { $in: this.user?.allowAccess?.gits } }] };

		return super.find(filter, options, pagination);
	}

	async findOne(filter?: IQueryFilter<IGitProvider>, options?: IQueryOptions): Promise<IGitProvider> {
		const [item] = await this.find(filter, options);
		if (!item) throw new Error(`Git provider not found.`);
		return item;
	}

	async update(filter: IQueryFilter<IGitProvider>, data: any, options?: IQueryOptions): Promise<IGitProvider[]> {
		// check permissions
		await checkPermissionsByFilter("gits", this, filter, this.user);

		let provider = await this.findOne(filter, options);
		if (!provider) throw new Error(`Git provider not found.`);

		if (provider.type === "github" && provider.host !== "github.com") data.host = "github.com";
		if (provider.type === "bitbucket" && provider.host !== "bitbucket.org") data.host = "bitbucket.org";

		if (data.org && provider.type === "github") {
			if (!provider.name) data.name = `${upperCase(data.org)} Github`;
		}

		if (data.org && provider.type === "bitbucket") {
			if (!provider.name) data.name = `${upperCase(data.org)} Bitbucket`;
		}

		if (!data.repo) data.repo = {};
		if (!data.repo.url && !data["repo.url"]) data.repo.url = `https://${provider.host}/${data.org}`;
		if (!data.repo.sshPrefix && !data["repo.sshPrefix"]) data.repo.sshPrefix = `git@${provider.host}:${data.org}`;

		// regenerate slug
		if (data.name) {
			const scope = this;
			const slugRange = "zxcvbnmasdfghjklqwertyuiop1234567890";
			async function generateUniqueSlug(input, attempt = 1) {
				let slug = makeSlug(input);

				let count = await scope.count({ slug });
				if (count > 0) slug = slug + "-" + randomStringByLength(attempt, slugRange).toLowerCase();

				// check unique again
				count = await scope.count({ slug });
				if (count > 0) return generateUniqueSlug(input, attempt + 1);

				return slug;
			}

			data.slug = await generateUniqueSlug(data.name, 1);
		}

		// verify connection
		data.verified = await this.verify(provider, options);

		// update to db
		[provider] = await super.update(filter, data, options);

		return [provider];
	}

	async updateOne(filter: IQueryFilter<IGitProvider>, data: any, options?: IQueryOptions): Promise<IGitProvider> {
		// check permissions
		await checkPermissionsByFilter("gits", this, filter, this.user);

		return super.updateOne(filter, data, options);
	}

	async delete(filter?: IQueryFilter<IGitProvider>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		// check permissions
		await checkPermissionsByFilter("gits", this, filter, this.user);

		return super.delete(filter, options);
	}

	async softDelete(filter?: IQueryFilter<IGitProvider>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		// check permissions
		await checkPermissionsByFilter("gits", this, filter, this.user);

		return super.softDelete(filter, options);
	}

	async verify(provider: IGitProvider, options?: { isDebugging?: boolean }) {
		// process
		// console.log("GitProviderService > provider :>> ", provider);
		const profile = await GitProviderAPI.getProfile(provider, options);
		console.log("GitProviderService > verify > profile :>> ", profile);
		return !profile || !profile.username ? false : true;
	}

	async listGitRepository(provider: IGitProvider, options?: IQueryOptions) {
		return GitProviderAPI.listGitRepositories(provider, options);
	}

	async deleteGitRepository(provider: IGitProvider, slug: string, options?: IQueryOptions) {
		return GitProviderAPI.deleteGitRepository(provider, provider.org, slug, options);
	}
}
