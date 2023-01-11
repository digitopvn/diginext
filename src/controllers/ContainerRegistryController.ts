import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import * as fs from "fs";
import path from "path";
import type { ParsedQs } from "qs";

import type { User } from "@/entities";
import digitalocean from "@/modules/providers/digitalocean";
import gcloud from "@/modules/providers/gcloud";
import ContainerRegistryService from "@/services/ContainerRegistryService";

import BaseController from "./BaseController";

export default class ContainerRegistryController extends BaseController<ContainerRegistryService> {
	constructor() {
		super(new ContainerRegistryService());
	}

	async connect(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const result: { status: number; messages: string[]; data: any } = { status: 1, messages: [], data: {} };

		const options = { userId: (req.user as User)._id as string, workspaceId: (req.user as User).workspaces[0] as string };
		// console.log("options :>> ", options);

		const { slug } = req.query;
		if (!slug) {
			result.status = 0;
			result.messages = [`Param "slug" is required.`];
			return res.status(200).json(result);
		}

		const registry = await this.service.findOne({ slug });
		if (!registry) {
			result.status = 0;
			result.messages = [`Container Registry not found: ${slug}.`];
			return res.status(200).json(result);
		}
		// console.log("registry :>> ", registry);

		const { provider, host } = registry;
		switch (provider) {
			case "gcloud":
				const { serviceAccount } = registry;
				const tmpDir = path.resolve(process.env.STORAGE, `registry`);
				if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
				const tmpFilePath = path.resolve(tmpDir, `gcloud-service-account.json`);
				fs.writeFileSync(tmpFilePath, serviceAccount, "utf8");

				const authResult = await gcloud.authenticate({ filePath: tmpFilePath, host, ...options });
				// console.log("authResult :>> ", authResult);
				if (authResult) {
					result.status = 1;
					result.messages = ["Ok"];
				} else {
					result.status = 0;
					result.messages = [`Google Cloud Container Registry authentication failed.`];
				}
				return res.status(200).json(result);
				break;

			case "digitalocean":
				const { apiAccessToken } = registry;
				const doResult = await digitalocean.authenticate({ key: apiAccessToken, ...options });
				if (doResult) {
					result.status = 1;
					result.messages = ["Ok"];
				} else {
					result.status = 0;
					result.messages = [`Digital Ocean Container Registry authentication failed.`];
				}
				return res.status(200).json(result);
				break;

			default:
				result.status = 0;
				result.messages = [`This container registry is not supported (${provider}), only "gcloud" and "digitalocean" are supported.`];
				return res.status(200).json(result);
				break;
		}
	}
}
