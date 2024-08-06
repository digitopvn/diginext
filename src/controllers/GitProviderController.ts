import { isEmpty } from "lodash";
import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import { GitProviderDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import type { GitProviderDomain, GitProviderType } from "@/interfaces/SystemTypes";
import { generateSSH, getPublicKey, sshKeysExisted, verifySSH, writeCustomSSHKeys } from "@/modules/git";
import GitProviderAPI, { GitRepositoryDto } from "@/modules/git/git-provider-api";
import { GitProviderService } from "@/services/GitProviderService";

import BaseController from "./BaseController";

@Tags("Git Provider")
@Route("git")
export default class GitProviderController extends BaseController {
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
	async read(@Queries() queryParams?: IGetQueryParams) {
		if (!this.filter) this.filter = {};

		try {
			const data = await this.service.find(this.filter, this.options, this.pagination);
			if (isEmpty(data)) throw new Error("No data found");
			return respondSuccess({ data });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: GitProviderDto, @Queries() queryParams?: IPostQueryParams) {
		try {
			const data = await this.service.create(body, this.options);
			return respondSuccess({ data });
		} catch (e) {
			// error
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	async update(@Body() body: GitProviderDto, @Queries() queryParams?: IPostQueryParams) {
		try {
			const data = await this.service.update(body, this.options);
			return respondSuccess({ data });
		} catch (e) {
			return respondFailure(e);
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	// ------------ GIT APIs ------------

	@Security("api_key")
	@Security("jwt")
	@Get("/verify")
	async verify(@Queries() queryParams?: IPostQueryParams) {
		// validation
		const { _id, slug } = this.filter;
		if (!_id && !slug) return respondFailure(`Git provider ID or slug is required.`);

		let provider = await this.service.findOne(this.filter, this.options);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			const isVerified = await this.service.verify(provider);
			return respondSuccess({ data: { isVerified } });
		} catch (e) {
			return respondFailure(e.toString());
		}
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/profile")
	async getProfile(@Queries() queryParams?: { _id?: string; slug?: string }) {
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
	async getListOrgs(
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
			const orgs = await GitProviderAPI.listOrgs(provider);
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
			const repos = await GitProviderAPI.listGitRepositories(provider);
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
		@Body() body: GitRepositoryDto,
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
			const repo = await GitProviderAPI.createGitRepository(provider, body, this.options);
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
		@Body() body: GitRepositoryDto,
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
		if (!_id && !slug) return respondFailure(`Git provider ID or slug is required.`);
		if (!body.name) return respondFailure(`Data git repo "name" (slug) is required.`);

		let provider = await this.service.findOne(this.filter, this.options);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			const repo = await GitProviderAPI.deleteGitRepository(provider, provider.org, body.name);
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
	@Get("/orgs/repos/branches")
	async listRepoBranches(
		@Queries()
		queryParams?: {
			/**
			 * Git provider's ID
			 */
			_id?: string;
			/**
			 * Git provider's SLUG
			 */
			slug?: string;
			/**
			 * Git repo's SLUG
			 */
			repo: string;
		}
	) {
		// repo's slug
		const repoSlug = this.filter.repo;
		if (!repoSlug) return respondFailure(`Repo's slug is required.`);
		delete this.filter.repo; // <-- to get correct git provider 😅

		// validation
		const { _id, slug } = this.filter;
		if (!_id && !slug) return respondFailure(`Git provider ID or slug is required.`);

		let provider = await this.service.findOne(this.filter, this.options);
		if (!provider) return respondFailure(`Git provider not found.`);

		// process
		try {
			const branches = await GitProviderAPI.listRepoBranches(provider, provider.org, repoSlug, this.options);
			return respondSuccess({ data: branches });
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
	async createKeysSSH(@Body() body: { gitDomain: GitProviderDomain; privateKey: string; publicKey: string }) {
		const { gitDomain, privateKey, publicKey } = body;

		try {
			const result = await writeCustomSSHKeys({ gitDomain, privateKey, publicKey });
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
