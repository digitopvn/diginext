// import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";
import { isEmpty } from "lodash";

import { Config } from "@/app.config";
import type { IUser, IWorkspace } from "@/entities";
import type { IBase } from "@/entities/Base";
import type { AppRequest, Ownership } from "@/interfaces/SystemTypes";
import { preprocessInputData } from "@/plugins";
import { parseFilterAndOptions, parsePagination } from "@/plugins/controller-parser";
import { type BaseService } from "@/services/BaseService";

import type { IQueryFilter, IQueryOptions, IResponsePagination } from "../interfaces/IQuery";
import type { ResponseData } from "../interfaces/ResponseData";
import { respondFailure, respondSuccess } from "../interfaces/ResponseData";

export default class BaseController<T extends IBase = any, S extends BaseService<T> = BaseService> {
	req: AppRequest;

	service: S;

	user: IUser;

	workspace: IWorkspace;

	ownership: Ownership;

	filter: IQueryFilter;

	options: IQueryOptions;

	pagination: IResponsePagination;

	constructor(service?: S) {
		if (service) {
			this.service = service;
			this.req = service.req;
		}
		this.ownership = { owner: this.user, workspace: this.workspace };
	}

	async read() {
		if (!this.filter) this.filter = {};

		let data: T | T[];
		if (this.filter._id) {
			data = await this.service.findOne(this.filter, this.options);
			if (isEmpty(data)) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Item not found.` });
		} else {
			data = (await this.service.find(this.filter, this.options, this.pagination)) || [];
			// if (isEmpty(data)) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: "" });
		}

		return respondSuccess({ data, ...this.pagination });
	}

	async create(inputData) {
		const data = await this.service.create(inputData);

		if (!data) return respondFailure("Can't create new item.");

		return respondSuccess({ data });
	}

	async update(updateData) {
		const data = await this.service.update(this.filter, updateData, this.options);
		if (isEmpty(data)) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Item not found.` });

		return respondSuccess({ data });
	}

	async delete() {
		const tobeDeletedItems = await this.service.count(this.filter);
		if (tobeDeletedItems === 0) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Items not found.` });

		const data = await this.service.delete(this.filter);
		return respondSuccess({ data });
	}

	async softDelete() {
		const tobeDeletedItems = await this.service.count(this.filter);
		if (tobeDeletedItems === 0) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Items not found.` });

		const data = await this.service.softDelete(this.filter);
		return respondSuccess({ data });
	}

	async empty() {
		let data: { ok: number };
		let result: ResponseData | (ResponseData & { data: typeof data }) = { status: 1, data, messages: [] };

		if (Config.ENV === "development") {
			const emptyRes = await this.service.empty(this.filter);
			result.data.ok = emptyRes.ok;
		} else {
			result.data = { ok: 0 };
			result.messages.push(`This function is restricted to use on development environment only.`);
		}

		return result;
	}

	parseDateRange(req: AppRequest, res?: Response, next?: NextFunction) {
		// TODO: process date range filter: from_date, to_date, from_time, to_time, date

		if (next) next();
	}

	parseBody(req: AppRequest, res?: Response, next?: NextFunction) {
		// log("req.body [1] >>", req.body);

		req.body = preprocessInputData(req.body);

		if (next) next();
	}

	/**
	 * Parse the filter option from the URL:
	 * - List (first page, 10 item per page, sort "desc" by "updatedAt" first, then "desc" by "createdAt"): `https://example.com/api/v1/user?page=1&size=10&sort=-updatedAt,-createdAt`
	 * - Search (by username that contains "john"): `https://example.com/api/v1/user?page=1&size=10&username=john&search=true`
	 */
	parseFilter(req: AppRequest, res?: Response, next?: NextFunction) {
		const parsed = parseFilterAndOptions(req);

		// assign to controller:
		this.options = parsed.options;
		this.filter = parsed.filter;

		if (next) next();
	}

	async parsePagination(req: AppRequest, res?: Response, next?: NextFunction) {
		if (!this.service) return;

		const pagination = await parsePagination(this.service, req);
		this.pagination = pagination;
		// log(`this.pagination >>`, this.pagination);

		if (next) next();
	}
}
