import axios from "axios";
import { randomStringByLength } from "diginext-utils/dist/string/random";
import { upperCase } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IGitProvider } from "@/entities";
import * as entities from "@/entities";
import type { IQueryFilter } from "@/interfaces";
import * as interfaces from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { generateSSH, getPublicKey, sshKeysExisted, verifySSH, writeCustomSSHKeys } from "@/modules/git";
import GitProviderAPI, * as gitProviderApi from "@/modules/git/git-provider-api";
import { makeSlug } from "@/plugins/slug";
import GitProviderService from "@/services/GitProviderService";

import BaseController from "./BaseController";

@Tags("Git Provider")
@Route("git")
export default class GitProviderController extends BaseController<IGitProvider> {
	service: GitProviderService;

	constructor() {
		super(new GitProviderService());
	}

	/**
	 * List of GIT providers
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		if (!this.filter) this.filter = {};

		try {
			this.options.isDebugging = true;
			const data = await this.service.find(this.filter, this.options, this.pagination);
			return respondSuccess({ data });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: entities.GitProviderDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		// validation
		const { type, name, bitbucket_oauth, github_oauth } = body;

		// if (!name) return respondFailure(`Git provider name is required.`);
		if (!type) return respondFailure(`Git provider type is required.`);

		let access_token: string, refresh_token: string, method: "bearer" | "basic";

		if (type === "bitbucket") {
			if (!bitbucket_oauth) return respondFailure(`Bitbucket OAuth information is required.`);

			if (!bitbucket_oauth.consumer_key && !bitbucket_oauth.consumer_secret) {
				// check app passwords
				if (!bitbucket_oauth.app_password || !bitbucket_oauth.username)
					return respondFailure(`Bitbucket username & app password are required.`);

				access_token = Buffer.from(`${bitbucket_oauth.username}:${bitbucket_oauth.app_password}`, "utf8").toString("base64");
				method = "basic";
			} else if (!bitbucket_oauth.app_password) {
				// check OAuth consumer
				if (!bitbucket_oauth.consumer_key || !bitbucket_oauth.consumer_secret)
					return respondFailure(`Bitbucket OAuth consumer key & secret are required.`);

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
					return respondFailure(e.toString());
				}
			} else {
				return respondFailure(`Bitbucket OAuth information (OAuth consumer or app password) is required.`);
			}

			// auto generated fields
			body.host = "bitbucket.org";
			if (!body.name) body.name = "Bitbucket";
		} else if (type === "github") {
			if (!github_oauth) return respondFailure(`Github OAuth information is required.`);

			if (!github_oauth.client_id && !github_oauth.client_secret) {
				// if (!name) return respondFailure(`Git provider name is required.`);
				// check personal access token
				if (!github_oauth.personal_access_token) return respondFailure(`Github Personal access token is required.`);

				access_token = github_oauth.personal_access_token;
				method = "bearer";
			} else if (!github_oauth.personal_access_token) {
				// check OAuth app (client_id & client_secret)
				if (!github_oauth.client_id || !github_oauth.client_secret)
					return respondFailure(`Github OAuth App's CLIENT_ID & CLIENT_SECRET are required.`);

				// access_token will be processed via client browser and automatically saved after that
				method = "bearer";
			} else {
				return respondFailure(`Github OAuth information (OAuth App or Personal Access Token) is required.`);
			}

			// auto generated fields
			body.host = "github.com";
			if (!body.name) body.name = "Github";
		} else {
			return respondFailure(`Git "${type}" type is not supported yet.`);
		}

		// grab data to create:
		body.access_token = access_token;
		body.refresh_token = refresh_token;
		body.method = method;

		// mark as organization git provider or not
		body.public = body.isOrg = (this.user.activeRole as entities.IRole).type === "admin";

		try {
			// verify
			await GitProviderAPI.getProfile(body);
			// save
			return await super.create(body);
		} catch (e) {
			// error
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: entities.GitProviderDto, @Queries() queryParams?: interfaces.IPostQueryParams) {
		let provider = await this.service.findOne(this.filter, this.options);
		if (!provider) return respondFailure(`Git provider not found.`);

		if (provider.type === "github" && provider.host !== "github.com") body.host = "github.com";
		if (provider.type === "bitbucket" && provider.host !== "bitbucket.org") body.host = "bitbucket.org";

		if (body.gitWorkspace && provider.type === "github") {
			if (!provider.name) body.name = `${upperCase(body.gitWorkspace)} Github`;
		}

		if (body.gitWorkspace && provider.type === "bitbucket") {
			if (!provider.name) body.name = `${upperCase(body.gitWorkspace)} Bitbucket`;
		}

		body.repo = {
			url: `https://${provider.host}/${body.gitWorkspace}`,
			sshPrefix: `git@${provider.host}:${body.gitWorkspace}`,
		};

		// regenerate slug
		if (body.name) {
			const scope = this;
			const slugRange = "zxcvbnmasdfghjklqwertyuiop1234567890";
			async function generateUniqueSlug(input, attempt = 1) {
				let slug = makeSlug(input);

				let count = await scope.service.count({ slug });
				if (count > 0) slug = slug + "-" + randomStringByLength(attempt, slugRange).toLowerCase();

				// check unique again
				count = await scope.service.count({ slug });
				if (count > 0) return generateUniqueSlug(input, attempt + 1);

				return slug;
			}

			body.slug = await generateUniqueSlug(body.name, 1);
		}

		// update to db
		provider = await this.service.updateOne(this.filter, body, this.options);
		// console.log("GitProviderController > provider :>> ", provider);

		// verify
		let msg = "";
		// try {
		provider = await this.service.verify(provider);
		// } catch (e) {
		// 	msg = e.toString();
		// }

		return respondSuccess({ data: provider, msg });
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: interfaces.IDeleteQueryParams) {
		return super.delete();
	}

	// ------------ GIT APIs ------------

	@Security("api_key")
	@Security("jwt")
	@Get("/verify")
	async verify(@Queries() queryParams?: interfaces.IPostQueryParams) {
		// validation
		const { _id, slug } = this.filter;

		if (!_id && !slug) return respondFailure(`Git provider ID or slug is required.`);

		let provider = await this.service.findOne(this.filter, this.options);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			provider = await this.service.verify(provider);
			return respondSuccess({ data: { provider } });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/profile")
	async getProfile(@Queries() queryParams?: interfaces.IPostQueryParams) {
		// validation
		const { _id, slug } = this.filter;
		if (!_id && !slug) return respondFailure(`Git provider ID or slug is required.`);

		let provider = await this.service.findOne(this.filter, this.options);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			const profile = await GitProviderAPI.getProfile(provider);

			return respondSuccess({ data: profile });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/orgs")
	async getListOrgs(@Queries() queryParams?: interfaces.IPostQueryParams) {
		// validation
		const { _id, slug } = this.filter;
		if (!_id && !slug) return respondFailure(`Git provider ID or slug is required.`);

		let provider = await this.service.findOne(this.filter, this.options);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			const orgs = await GitProviderAPI.listOrgs(provider);
			console.log("orgs :>> ", orgs);
			return respondSuccess({ data: orgs });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	/**
	 * List organization repositories
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/orgs/repos")
	async getListOrgRepos(
		@Queries()
		queryParams?: {
			/**
			 * Git provider's ID
			 */
			_id?: string;
			/**
			 * Git provider's SLUG¸¸¸
			 */
			slug?: string;
		}
	) {
		// validation
		const { _id, slug } = this.filter;
		if (!_id && !slug) return respondFailure(`Git provider ID or slug is required.`);

		let provider = await this.service.findOne(this.filter, this.options);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			const repos = await GitProviderAPI.listOrgRepositories(provider);
			return respondSuccess({ data: repos });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	/**
	 * Create new repository in git provider organization
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/orgs/repos")
	async createOrgRepo(
		@Body() body: gitProviderApi.GitRepositoryDto,
		@Queries()
		queryParams?: {
			/**
			 * Git provider's ID
			 */
			_id?: string;
			/**
			 * Git provider's SLUG¸¸¸
			 */
			slug?: string;
		}
	) {
		// validation
		const { _id, slug } = this.filter;
		if (!_id && !slug) return respondFailure(`Git provider ID or slug is required.`);

		const filter: IQueryFilter = {};
		if (_id) filter._id = _id;
		if (slug) filter.slug = slug;

		let provider = await this.service.findOne(filter);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			const repo = await GitProviderAPI.createOrgRepository(provider, body);
			return respondSuccess({ data: repo });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	/**
	 * Create new repository in git provider organization
	 */
	@Security("api_key")
	@Security("jwt")
	@Delete("/orgs/repos")
	async deleteOrgRepo(
		@Body() body: gitProviderApi.GitRepositoryDto,
		@Queries()
		queryParams?: {
			/**
			 * Git provider's ID
			 */
			_id?: string;
			/**
			 * Git repository's SLUG¸¸¸
			 */
			slug?: string;
		}
	) {
		// validation
		const { _id, slug } = this.filter;
		if (!_id && !slug) return respondFailure(`Param git provider's "_id" or "slug" is required.`);
		if (!body.name) return respondFailure(`Data git repo "name" (slug) is required.`);

		const filter: IQueryFilter = {};
		if (_id) filter._id = _id;
		if (slug) filter.slug = slug;

		let provider = await this.service.findOne(filter);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			const repo = await GitProviderAPI.deleteOrgRepository(provider, provider.gitWorkspace, body.name);
			return respondSuccess({ data: repo });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	// ------------ SSH KEYS ------------

	@Security("api_key")
	@Security("jwt")
	@Get("/ssh/public-key")
	async getPublicKey() {
		const isSshKeysExisted = await sshKeysExisted();
		if (!isSshKeysExisted) return respondFailure({ msg: `PUBLIC_KEY is not existed on this server.` });

		const publicKey = await getPublicKey();
		return respondSuccess({ data: publicKey });
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/ssh/create")
	async createKeysSSH(@Body() body: { privateKey: string; publicKey: string }) {
		const { privateKey, publicKey } = body;

		try {
			const result = await writeCustomSSHKeys({ privateKey, publicKey });
			return { status: 1, data: result } as ResponseData;
		} catch (e) {
			return { status: 0, messages: [e.message] } as ResponseData;
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/ssh/generate")
	async generateSSH() {
		const result: ResponseData & { publicKey?: string } = { status: 1, messages: [], data: {} };

		try {
			const publicKey = await generateSSH();
			result.data = { publicKey };
			result.messages = [`Copy this public key content & add to GIT provider.`];
			return result;
		} catch (e) {
			result.status = 0;
			result.messages = [e.message];
			return result;
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/ssh/verify")
	async verifySSH(@Queries() queryParams?: { provider: GitProviderType }) {
		const gitProvider = this.filter.provider as GitProviderType;
		if (!gitProvider) {
			return { status: 0, messages: [`Param "provider" is required.`] } as ResponseData;
		}

		try {
			const verified = await verifySSH({ gitProvider });
			return { status: 1, data: { verified } } as ResponseData;
		} catch (e) {
			return { status: 0, messages: [e.message] } as ResponseData;
		}
	}
}
