import { isJSON } from "class-validator";
import type { NextFunction, Response } from "express";

import type { Workspace } from "@/entities";
import type Activity from "@/entities/Activity";
import type Route from "@/entities/Route";
import type { AppRequest, AppResponse } from "@/interfaces/SystemTypes";
import { DB } from "@/modules/api/DB";
import ActivityService from "@/services/ActivityService";

function logResponseBody(req: AppRequest, res: AppResponse, next: NextFunction) {
	const oldEnd = res.end;
	const chunks = [];

	res.end = function (this: AppResponse, chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
		if (chunk) {
			chunks.push(chunk);
		}

		const body = Buffer.concat(chunks).toString("utf8");
		this.body = body;
		return oldEnd.call(this, chunk, encoding, cb);
	};

	next();
}

export default logResponseBody;

export const saveActivityLog = async (req: AppRequest, res: AppResponse, next: NextFunction) => {
	// Only save log for POST, PATCH & DELETE
	if (req.method === "GET") return next();

	const { user, role, workspace } = req;
	// console.log("saveActivityLog > body :>> ", res.body);
	console.log("user :>> ", user);
	// console.log('role :>> ', role);

	if (user) {
		// parse & create activity dto:
		const activityDto: Activity = {};
		activityDto.owner = user._id;
		activityDto.workspace = workspace || (user.activeWorkspace as Workspace);
		activityDto.name = user.name;
		activityDto.response = res.body;
		activityDto.responseStatus = isJSON(res.body) ? JSON.parse(res.body).status : undefined;
		activityDto.method = req.method;
		activityDto.query = req.query;
		activityDto.httpStatus = req.statusCode;

		const route = await DB.findOne<Route>("route", { path: req.originalUrl });
		activityDto.url = req.originalUrl;
		activityDto.route = req.path;
		activityDto.routeName = route?.name;

		// write activity log to database:
		const activitySvc = new ActivityService();
		const activity = await activitySvc.create(activityDto);
		console.log("Saved activity info :>> ", activity._id);
	}

	next();
};
