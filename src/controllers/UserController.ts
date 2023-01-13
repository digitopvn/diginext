import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

import UserService from "../services/UserService";
import BaseController from "./BaseController";

export default class UserController extends BaseController<UserService> {
	constructor() {
		super(new UserService());
	}

	async joinWorkspace(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): Promise<Response<any, Record<string, any>>> {
		const { userId, workspace } = req.body;
		const result = { status: 1, messages: [], data: {} };
		// console.log("{ userId, workspace } :>> ", { userId, workspace });

		try {
			const users = await this.service.joinWorkspace(userId, workspace as string);
			result.data = users;
		} catch (e) {
			result.messages.push(e.message);
			result.status = 0;
		}

		return res.status(200).json(result);
	}
}
