import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

import { generateSSH, verifySSH } from "@/modules/git";
import GitProviderService from "@/services/GitProviderService";

import BaseController from "./BaseController";

export default class GitProviderController extends BaseController<GitProviderService> {
	constructor() {
		super(new GitProviderService());
	}

	async generateSSH(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const result: { status: number; messages: string[]; data: any } = { status: 1, messages: [], data: {} };

		try {
			const publicKey = await generateSSH();
			result.data = { publicKey };
			result.messages = [`Copy this public key content & add to GIT provider.`];
			return res.status(200).json(result);
		} catch (e) {
			result.status = 0;
			result.messages = [e.message];
			return res.status(200).json(result);
		}
	}

	async verifySSH(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const result: { status: number; messages: string[]; data: any } = { status: 1, messages: [], data: {} };

		const gitProvider = req.query["git-provider"] as string;
		if (!gitProvider) {
			result.status = 0;
			result.messages = [`Param "git-provider" is required.`];
			return res.status(200).json(result);
		}

		try {
			const verified = await verifySSH({ gitProvider });
			result.status = 1;
			result.data = { verified };
			return res.status(200).json(result);
		} catch (e) {
			result.status = 0;
			result.messages = [e.message];
			return res.status(200).json(result);
		}
	}
}
