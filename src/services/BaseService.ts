import { logError } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import { clearUnicodeCharacters } from "diginext-utils/dist/string/index";
import { randomStringByLength } from "diginext-utils/dist/string/random";

import type { User } from "@/entities";
import type Base from "@/entities/Base";
import type { AppRequest } from "@/interfaces/SystemTypes";
import type { EntityTarget, MongoRepository, ObjectLiteral } from "@/libs/typeorm";
import type { MongoFindManyOptions } from "@/libs/typeorm/find-options/mongodb/MongoFindManyOptions";
import { manager, query } from "@/modules/AppDatabase";
import { isValidObjectId } from "@/plugins/mongodb";
import { parseRequestFilter } from "@/plugins/parse-request-filter";

import type { IQueryFilter, IQueryOptions, IQueryPagination } from "../interfaces/IQuery";

/**
 * ![DANGEROUS]
 * This pass phrase is ONLY being used to empty a database,
 * and should not being used for production evironment.
 */
const EMPTY_PASS_PHRASE = "nguyhiemvcl";

export default class BaseService<E extends Base & { owner?: any; workspace?: any } & ObjectLiteral> {
	protected query: MongoRepository<ObjectLiteral>;

	req?: AppRequest;

	constructor(entity: EntityTarget<E>) {
		this.query = query(entity);
	}

	async count(filter?: IQueryFilter, options?: IQueryOptions) {
		const parsedFilter = parseRequestFilter(filter);
		// log(`- BaseService.count :>>`, { filter: parsedFilter, options });
		return this.query.count({ ...parsedFilter, ...options });
	}

	async create(data: E) {
		try {
			// generate slug (if needed)
			const scope = this;
			const slugRange = "zxcvbnmasdfghjklqwertyuiop1234567890";
			async function generateUniqueSlug(input, attempt = 1) {
				let slug = makeSlug(input);

				let count = await scope.count({ slug });
				if (count > 0) slug = slug + "-" + randomStringByLength(attempt, slugRange).toLowerCase();

				// check unique again
				count = await scope.count({ slug });
				if (count > 0) return generateUniqueSlug(input, attempt + 1);

				return slug;
			}

			if (data.slug) {
				let count = await scope.count({ slug: data.slug });
				if (count > 0) data.slug = await generateUniqueSlug(data.slug, 1);
			} else {
				data.slug = await generateUniqueSlug(data.name || "item", 1);
			}

			// generate metadata (for searching)
			data.metadata = {};
			for (const [key, value] of Object.entries(data)) {
				if (key != "_id" && key != "metadata" && key != "slug" && !isValidObjectId(value) && value)
					data.metadata[key] = clearUnicodeCharacters(value.toString());
			}

			// assign item authority:
			if (this.req?.user) {
				const user = this.req?.user as User;
				const userId = user?._id;
				const workspaceId = (user.activeWorkspace as any)._id ? (user.activeWorkspace as any)._id : (user.activeWorkspace as any);
				data.owner = userId;
				data.workspace = workspaceId;
			}

			// const author = `${user.name} (ID: ${user._id})`;
			// console.log(`BaseService.create :>>`, { data });

			const item = await this.query.create(data);

			return (await manager.save(item)) as E;
		} catch (e) {
			logError(e);
			return;
		}
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<E[]> {
		// console.log(`BaseService > find :>> filter:`, filter);
		// const query = this.query;
		// let results;
		// log("options.populate >>", options.populate);
		// log("pagination >>", pagination);
		const findOptions: MongoFindManyOptions<ObjectLiteral> = {};

		if (filter) findOptions.where = filter;
		if (options?.order) findOptions.order = options.order;
		if (options?.select && options.select.length > 0) findOptions.select = options.select;
		// if (pagination?.page_size) findOptions.take = pagination.page_size;
		// if (pagination?.current_page > 0 && pagination.page_size > 0) findOptions.skip = (pagination.current_page - 1) * pagination.page_size;
		if (options?.skip) findOptions.skip = options.skip;
		if (options?.limit) findOptions.take = options.limit;

		if (options?.populate && options?.populate.length > 0) {
			findOptions.relations = {};
			options?.populate.map((popColumn) => {
				findOptions.relations[popColumn] = true;
			});
		}
		// log(`findOptions >>`, findOptions);

		const [results, totalItems] = await Promise.all([this.query.find(findOptions), this.query.count(filter)]);
		// log(`results >>`, results);

		if (pagination) {
			pagination.total_items = totalItems || results.length;
			pagination.total_pages = pagination.page_size ? Math.ceil(totalItems / pagination.page_size) : 1;

			const prevPage = pagination.current_page - 1 <= 0 ? 1 : pagination.current_page - 1;
			const nextPage =
				pagination.current_page + 1 > pagination.total_pages && pagination.total_pages != 0
					? pagination.total_pages
					: pagination.current_page + 1;

			pagination.prev_page =
				pagination.current_page != prevPage
					? `${this.req.protocol}://${this.req.get("host")}${this.req.baseUrl}${this.req.path}` +
					  "?" +
					  new URLSearchParams({ ...this.req.query, page: prevPage.toString(), size: pagination.page_size.toString() }).toString()
					: null;

			pagination.next_page =
				pagination.current_page != nextPage
					? `${this.req.protocol}://${this.req.get("host")}${this.req.baseUrl}${this.req.path}` +
					  "?" +
					  new URLSearchParams({ ...this.req.query, page: nextPage.toString(), size: pagination.page_size.toString() }).toString()
					: null;
		}

		return results as E[];
	}

	async findOne(filter?: IQueryFilter, options?: IQueryOptions) {
		// console.log(`findOne > filter :>>`, filter);
		// console.log(`findOne > options :>>`, options);
		const results = await this.find(filter, options);

		return results.length > 0 ? results[0] : null;
	}

	async update(filter: IQueryFilter, data: ObjectLiteral, options?: IQueryOptions) {
		// Manually update date to "updatedAt" column
		data.updatedAt = new Date();

		const updateData = options?.raw ? data : { $set: data };
		const updateRes = await this.query.updateMany(filter, updateData);

		if (updateRes.matchedCount > 0) {
			const results = await this.find(filter, options);
			return results;
		} else {
			return [];
		}
	}

	async softDelete(filter?: IQueryFilter): Promise<{ ok?: number; error?: string }> {
		// Manually update "deleteAt" to database since TypeORM MongoDB doesn't support "softDelete" yet
		const deleteRes = await this.query.updateMany(filter, { $set: { deletedAt: new Date() } });
		return { ok: deleteRes.matchedCount };

		/**
		 * [TypeORM] MongoDB driver doesn't support "softDelete" yet (or maybe it doesn't work because of bugs)
		 */
		// const deleteRes = await this.query.softDelete(filter);
		// console.log("deleteRes", deleteRes);
		// return deleteRes;
		// return null;
	}

	async delete(filter?: IQueryFilter) {
		const deleteRes = await this.query.deleteMany(filter);
		return deleteRes.result;
	}

	async empty(filter?: IQueryFilter) {
		if (filter?.pass != EMPTY_PASS_PHRASE) return { ok: 0, n: 0, error: "[DANGER] You need a password to process this, buddy!" };
		const deleteRes = await this.query.deleteMany({});
		return { ...deleteRes.result, error: null };
	}
}

export { BaseService };
