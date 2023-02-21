import { Body, Delete, Get, Patch, Post, Queries } from "tsoa/dist";

import type { GitProvider } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { generateSSH, verifySSH } from "@/modules/git";
import GitProviderService from "@/services/GitProviderService";

import BaseController from "./BaseController";

export default class GitProviderController extends BaseController<GitProvider> {
	constructor() {
		super(new GitProviderService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<GitProvider, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<GitProvider, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Get("/ssh")
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

	@Get("/verify-ssh")
	async verifySSH(@Queries() queryParams?: { ["git-provider"]: string }) {
		const result: ResponseData & { verified?: boolean } = { status: 1, messages: [], data: {} };

		const gitProvider = this.filter["git-provider"] as string;
		if (!gitProvider) {
			result.status = 0;
			result.messages = [`Param "git-provider" is required.`];
			return result;
		}

		try {
			const verified = await verifySSH({ gitProvider });
			result.status = 1;
			result.data = { verified };
			return result;
		} catch (e) {
			result.status = 0;
			result.messages = [e.message];
			return result;
		}
	}
}
