import { logError } from "diginext-utils/dist/console/log";
import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

import type { User } from "@/entities";
import ClusterManager from "@/modules/k8s";
import ClusterService from "@/services/ClusterService";

import BaseController from "./BaseController";

export default class ClusterController extends BaseController<ClusterService> {
	constructor() {
		super(new ClusterService());
	}

	async connect(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const result: { status: number; messages: string[]; data: any } = { status: 1, messages: [], data: {} };

		const options = { userId: (req.user as User)._id as string, workspaceId: (req.user as User).activeWorkspace as string };
		// console.log("options :>> ", options);

		const { slug } = req.query;
		if (!slug) {
			result.status = 0;
			result.messages = [`Param "slug" is required.`];
			return res.status(200).json(result);
		}

		const cluster = await this.service.findOne({ slug });
		if (!cluster) {
			result.status = 0;
			result.messages = [`Cluster not found: ${slug}.`];
			return res.status(200).json(result);
		}
		// console.log("registry :>> ", registry);

		const { shortName } = cluster;
		try {
			const authResult = await ClusterManager.auth(shortName);
			if (authResult) {
				result.status = 1;
				result.messages = ["Ok"];
			} else {
				result.status = 0;
				result.messages = [`Cluster authentication failed.`];
			}
		} catch (e) {
			logError(e);
			result.status = 0;
			result.messages = [`Cluster authentication failed: ${e}`];
		}
		return res.status(200).json(result);
	}
}
