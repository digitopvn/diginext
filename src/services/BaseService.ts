import { logError } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import { clearUnicodeCharacters } from "diginext-utils/dist/string/index";
import { randomStringByLength } from "diginext-utils/dist/string/random";
import type { DeleteResult } from "mongodb";
import type { Document, Model, PipelineStage, Schema } from "mongoose";
import { model } from "mongoose";

import type { IBase } from "@/entities/Base";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { isValidObjectId, MongoDB } from "@/plugins/mongodb";
import { parseRequestFilter } from "@/plugins/parse-request-filter";
import { traverseObjectAndTransformValue } from "@/plugins/traverse";

import type { IQueryFilter, IQueryOptions, IQueryPagination } from "../interfaces/IQuery";

function setDateWhenUpdateDocument(this: IBase & Document, next: (error?: NativeError) => void) {
	this.updateOne({}, { $set: { updatedAt: new Date() } });
	next();
}

function setDateWhenCreateDocument(this: IBase & Document, next: (error?: NativeError) => void) {
	const now = new Date();
	this.updatedAt = now;
	if (!this.createdAt) this.createdAt = now;
	next();
}

/**
 * ![DANGEROUS]
 * This pass phrase is ONLY being used to empty a database,
 * and should not being used for production evironment.
 */
const EMPTY_PASS_PHRASE = "nguyhiemvcl";

export default class BaseService<T> {
	private readonly model: Model<T>;

	req?: AppRequest;

	constructor(schema: Schema) {
		// make sure "createdAt" and "updatedAt" are set when creating/updating documents
		schema.pre("save", setDateWhenCreateDocument);
		schema.pre("updateOne", setDateWhenUpdateDocument);
		schema.pre("updateMany", setDateWhenUpdateDocument);

		const collection = schema.get("collection");
		this.model = model<T>(collection, schema, collection);
	}

	async count(filter?: IQueryFilter, options?: IQueryOptions) {
		const parsedFilter = filter;
		parsedFilter.deletedAt = { $exists: false };
		return this.model.countDocuments({ ...parsedFilter, ...options }).exec();
	}

	async create(data: any): Promise<T> {
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
				const { user } = this.req;
				const userId = user?._id;
				data.owner = userId;

				if (user.activeWorkspace) {
					const workspaceId = (user.activeWorkspace as any)._id ? (user.activeWorkspace as any)._id : (user.activeWorkspace as any);
					data.workspace = workspaceId;
				}
			}

			const createdDoc = new this.model(data);
			const newItem = await createdDoc.save();
			return newItem as T;
		} catch (e) {
			logError(e);
			return;
		}
	}

	async find(filter?: IQueryFilter, options: IQueryOptions & IQueryPagination = {}, pagination?: IQueryPagination) {
		// console.log(`BaseService > find :>> filter:`, filter);

		// where
		const where = {
			...parseRequestFilter(filter),
			deletedAt: { $exists: false },
		};
		const pipelines: PipelineStage[] = [
			{
				$match: where,
			},
		];

		// populate
		if (options?.populate && options?.populate.length > 0) {
			options?.populate.forEach((collection) => {
				const lookupCollection = this.model.schema.paths[collection].options.ref;
				const isPopulatedFieldArray = Array.isArray(this.model.schema.paths[collection].options.type);

				// use $lookup to find relation field
				pipelines.push({
					$lookup: {
						from: lookupCollection,
						localField: collection,
						foreignField: "_id",
						as: collection,
					},
				});

				// if there are many results, return an array, if there are only 1 result, return an object
				pipelines.push({
					$addFields: {
						[collection]: {
							$cond: isPopulatedFieldArray
								? [{ $isArray: `$${collection}` }, `$${collection}`, { $ifNull: [`$${collection}`, null] }]
								: {
										if: {
											$and: [{ $isArray: `$${collection}` }, { $eq: [{ $size: `$${collection}` }, 1] }],
										},
										then: { $arrayElemAt: [`$${collection}`, 0] },
										else: {
											$cond: {
												if: {
													$and: [{ $isArray: `$${collection}` }, { $ne: [{ $size: `$${collection}` }, 1] }],
												},
												then: `$${collection}`,
												else: null,
											},
										},
								  },
						},
					},
				});
			});
		}

		// sort
		if (options?.order) {
			pipelines.push({ $sort: options?.order });
		}

		// select
		if (options?.select && options.select.length > 0) {
			const project: any = {};
			options.select.forEach((field) => {
				project[field] = 1;
			});
			pipelines.push({ $project: project });
		}

		// skip & limit (take)
		if (options?.skip) pipelines.push({ $skip: options.skip });
		if (options?.limit) pipelines.push({ $limit: options.limit });

		let [results, totalItems] = await Promise.all([this.model.aggregate(pipelines).exec(), this.model.countDocuments(where).exec()]);
		// log(`results >>`, results);

		// convert all {ObjectId} to {string}:
		traverseObjectAndTransformValue(results, ([key, val]) => {
			if (MongoDB.isObjectId(val)) return val.toString();
			return val;
		});

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

		return results as T[];
	}

	async findOne(filter?: IQueryFilter, options: IQueryOptions = {}) {
		// console.log(`findOne > filter :>>`, filter);
		// console.log(`findOne > options :>>`, options);
		const result = await this.find(filter, { ...options, limit: 1 });
		return result[0] as T;
	}

	async update(filter: IQueryFilter, data: any, options: IQueryOptions = {}) {
		// Manually update date to "updatedAt" column
		data.updatedAt = new Date();

		const updateFilter = filter;
		updateFilter.deletedAt = { $exists: false };

		const updateData = options?.raw ? data : { $set: data };
		const updateRes = await this.model.updateMany(updateFilter, updateData).exec();

		if (updateRes.matchedCount > 0) {
			const results = await this.find(updateFilter, options);
			return results;
		} else {
			return [];
		}
	}

	async updateOne(filter: IQueryFilter, data: any, options: IQueryOptions = {}) {
		return this.update(filter, data, { ...options, limit: 1 });
	}

	async softDelete(filter?: IQueryFilter): Promise<{ ok?: number; error?: string }> {
		// Manually update "deleteAt" to database since TypeORM MongoDB doesn't support "softDelete" yet
		const deleteFilter = filter;
		const deleteRes = await this.model.updateMany(deleteFilter, { $set: { deletedAt: new Date() } }).exec();
		return { ok: deleteRes.matchedCount };
	}

	async delete(filter?: IQueryFilter): Promise<DeleteResult> {
		const deleteFilter = filter;
		const deleteRes = await this.model.deleteMany(deleteFilter).exec();
		return deleteRes;
	}

	async empty(filter?: IQueryFilter) {
		if (filter?.pass != EMPTY_PASS_PHRASE) return { ok: 0, n: 0, error: "[DANGER] You need a password to process this, buddy!" };
		const deleteRes = await this.model.deleteMany({}).exec();
		return { ...deleteRes, error: null };
	}
}

export { BaseService };
