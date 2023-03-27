import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { GitProvider } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { generateSSH, getPublicKey, sshKeysExisted, verifySSH, writeCustomSSHKeys } from "@/modules/git";
import GitProviderService from "@/services/GitProviderService";

import BaseController from "./BaseController";

@Tags("Git Provider")
@Route("git")
export default class GitProviderController extends BaseController<GitProvider> {
	constructor() {
		super(new GitProviderService());
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	create(@Body() body: Omit<GitProvider, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: Omit<GitProvider, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/ssh/public-key")
	async getPublicKey(@Queries() queryParams?: IGetQueryParams) {
		const isSshKeysExisted = await sshKeysExisted();
		if (!isSshKeysExisted) return { status: 0, messages: [`PUBLIC_KEY is not existed on this server.`] } as ResponseData;
		const publicKey = await getPublicKey();
		return { status: 1, data: publicKey } as ResponseData;
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
	async verifySSH(@Queries() queryParams?: { provider: string }) {
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
