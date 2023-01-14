import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

import WorkspaceService from "@/services/WorkspaceService";

import BaseController from "./BaseController";

export default class WorkspaceController extends BaseController<WorkspaceService> {
	constructor() {
		super(new WorkspaceService());
	}

	async addUser(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const { userId, workspaceId } = req.body;
		const result = { status: 1, messages: [], data: {} };

		try {
			const users = this.service.addUser(userId as string, workspaceId as string);
			result.data = users;
		} catch (e) {
			result.messages.push(e.message);
			result.status = 0;
		}

		return res.status(200).json(result);
	}
}
