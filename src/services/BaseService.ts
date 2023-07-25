import { clearUnicodeCharacters } from "diginext-utils/dist/string/index";
import { randomStringByLength } from "diginext-utils/dist/string/random";
import { logError } from "diginext-utils/dist/xconsole/log";
import { cloneDeepWith } from "lodash";
import type { Model, PipelineStage, Schema } from "mongoose";
import { model } from "mongoose";

import type { IRole, IUser, IWorkspace } from "@/entities";
import { roleSchema, workspaceSchema } from "@/entities";
import type { AppRequest, Ownership } from "@/interfaces/SystemTypes";
import { isValidObjectId, MongoDB } from "@/plugins/mongodb";
import { parseRequestFilter } from "@/plugins/parse-request-filter";
import { makeSlug } from "@/plugins/slug";
import { replaceObjectIdsToStrings } from "@/plugins/traverse";

import type { IQueryFilter, IQueryOptions, IQueryPagination } from "../interfaces/IQuery";

/**
 * ![DANGEROUS]
 * This pass phrase is ONLY being used to empty a database,
 * and should not being used for production evironment.
 */
const EMPTY_PASS_PHRASE = "nguyhiemvcl";

export default class BaseService<T = any> {
	readonly model: Model<T>;

	/**
	 * Current login user
	 */
	user?: IUser;

	/**
	 * Current active workspace
	 */
	workspace?: IWorkspace;

	/**
	 * Current owner & workspace
	 */
	ownership?: Ownership;

	req?: AppRequest;

	constructor(schema: Schema, ownership?: Ownership) {
		const collection = schema.get("collection");
		this.model = model<T>(collection, schema, collection);
		this.ownership = ownership;
		this.user = ownership?.owner;
		this.workspace = ownership?.workspace;
	}

	async getActiveWorkspace(user: IUser) {
		let workspace = (user.activeWorkspace as any)._id ? (user.activeWorkspace as IWorkspace) : undefined;
		if (!workspace && MongoDB.isValidObjectId(user.activeWorkspace)) {
			const wsModel = model("workspaces", workspaceSchema, "workspaces");
			workspace = await wsModel.findOne({ _id: user.activeWorkspace });
		}
		return workspace;
	}

	async getActiveRole(user: IUser) {
		let role = (user.activeRole as any)._id ? (user.activeRole as IRole) : undefined;
		if (!role && MongoDB.isValidObjectId(user.activeRole)) {
			const Model = model("roles", roleSchema, "roles");
			role = await Model.findOne({ _id: user.activeRole });
		}
		return role;
	}

	async count(filter?: IQueryFilter<T>, options: IQueryOptions = {}) {
		const parsedFilter = filter;
		parsedFilter.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];

		if (options.isDebugging) console.log(`BaseService > COUNT "${this.model.collection.name}" collection > parsedFilter :>>`, parsedFilter);

		const total = this.model.countDocuments(parsedFilter).exec();
		if (options.isDebugging) console.log(`BaseService > COUNT "${this.model.collection.name}" collection > total :>>`, total);
		return total;
	}

	async create(data: any, options: IQueryOptions = {}): Promise<T> {
		try {
			// generate slug (if needed)
			const scope = this;
			const slugRange = "zxcvbnmasdfghjklqwertyuiop1234567890";
			async function generateUniqueSlug(input, attempt = 1) {
				let slug = makeSlug(input, { delimiter: "" });

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
			const metadataExcludes: string[] = [
				"_id",
				"password",
				"slug",
				"token",
				"access_token",
				"secret",
				"kubeConfig",
				"serviceAccount",
				"apiAccessToken",
				"metadata",
			];
			for (const [key, value] of Object.entries(data)) {
				if (!metadataExcludes.includes(key) && !isValidObjectId(value) && value)
					data.metadata[key] = clearUnicodeCharacters(value.toString());
			}

			// assign item ownership:
			if (this.req?.user) {
				const { user } = this.req;
				const userId = user?._id;
				data.owner = userId;
				data.ownerSlug = user?.slug;

				if (options.isDebugging) console.log(`${this.model.collection.name} :>> `, user.activeWorkspace);

				if (this.model.collection.name !== "workspaces" && user.activeWorkspace) {
					const workspace = await this.getActiveWorkspace(user);
					if (workspace) {
						data.workspace = workspace._id;
						data.workspaceSlug = workspace.slug;
					}
				}
			}
			if (this.ownership) {
				data.owner = this.ownership.owner?._id;
				data.ownerSlug = this.ownership.owner?.slug;
				if (this.model.collection.name !== "workspaces") {
					data.workspace = this.ownership.workspace?._id;
					data.workspaceSlug = this.ownership.workspace?.slug;
				}
			}

			// convert all valid "ObjectId" string to ObjectId()
			data = cloneDeepWith(data, function (val) {
				if (isValidObjectId(val)) return MongoDB.toObjectId(val);
			});

			// set created/updated date:
			data.createdAt = data.updatedAt = new Date();
			if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > create > data :>> `, data);

			const createdDoc = new this.model(data);
			let newItem = await createdDoc.save();
			if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > create > newItem :>> `, newItem);

			// strip unneccessary fields
			delete newItem.__v;
			newItem.id = newItem._id;

			// convert all {ObjectId} to {string}:
			return replaceObjectIdsToStrings(newItem) as T;
		} catch (e) {
			logError(`[BASE_SERVICE] Create:`, e);
			return;
		}
	}

	async find(filter: IQueryFilter<T> = {}, options: IQueryOptions & IQueryPagination = {}, pagination?: IQueryPagination) {
		// if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > find :>> filter:`, filter);

		// where
		let _filter = parseRequestFilter(filter);

		const where = { ..._filter };
		if (!options?.deleted) where.deletedAt = { $exists: false };
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > find > where :>>`, where);

		const pipelines: PipelineStage[] = [
			{
				$match: where,
			},
		];

		// populate
		if (options?.populate && options?.populate.length > 0) {
			options?.populate.forEach((collection) => {
				const collectionPath = this.model.schema.paths[collection];
				if (!collectionPath) return;

				const lookupCollection = collectionPath.options?.ref;
				if (!lookupCollection) return;

				const isPopulatedFieldArray = Array.isArray(collectionPath.options.type);

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
		// console.log(`"${this.model.collection.name}" > results >>`, results);

		if (pagination && this.req) {
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

		// convert all {ObjectId} to {string}:
		results = replaceObjectIdsToStrings(
			results.map((item) => {
				delete item.__v;
				item.id = item._id;
				return item;
			})
		);
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > find > json results >>`, results);
		// console.log("isArray(results) :>> ", isArray(results));
		return results as T[];
	}

	async findOne(filter?: IQueryFilter<T>, options: IQueryOptions = {}) {
		const result = await this.find(filter, { ...options, limit: 1 });
		return result[0] as T;
	}

	/**
	 * Looking for unique "field" path of the documents in a collection
	 * @param path - Document path (field) to be groupped
	 */
	async distinct(path: string, filter: IQueryFilter<T> = {}, options: IQueryOptions & IQueryPagination = {}, pagination?: IQueryPagination) {
		// where
		let _filter = parseRequestFilter(filter);

		const where = { ..._filter };
		if (!options?.deleted) where.deletedAt = { $exists: false };
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > find > where :>>`, where);

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

		// distinct
		pipelines.push({ $project: { [`${path}`]: { $toString: `$${path}` } } });
		pipelines.push({ $group: { _id: `$${path}` } });
		pipelines.push({ $project: { _id: 0, [`${path}`]: `$_id` } });

		// skip & limit (take)
		if (options?.skip) pipelines.push({ $skip: options.skip });
		if (options?.limit) pipelines.push({ $limit: options.limit });

		let [results, totalItems] = await Promise.all([this.model.aggregate(pipelines).exec(), this.model.countDocuments(where).exec()]);
		// console.log(`"${this.model.collection.name}" > results >>`, results);

		if (pagination && this.req) {
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

		// convert all {ObjectId} to {string}:
		results = replaceObjectIdsToStrings(
			results.map((item) => {
				delete item.__v;
				item.id = item._id;
				return item;
			})
		);
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > distinct > json results >>`, results);
		// console.log("isArray(results) :>> ", isArray(results));
		return results as any[];
	}

	async update(filter: IQueryFilter<T>, data: any, options: IQueryOptions = {}) {
		const updateFilter = { ...filter };
		if (!options?.deleted) updateFilter.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];

		// convert all valid "ObjectId" string to ObjectId()
		const convertedData = cloneDeepWith(data, function (val) {
			if (isValidObjectId(val)) return MongoDB.toObjectId(val);
		});

		// set updated date
		if (convertedData.$set) {
			convertedData.$set.updatedAt = new Date();
			convertedData.$set.updatedBy = this.ownership?.owner._id;
		} else {
			convertedData.updatedAt = new Date();
			convertedData.updatedBy = this.ownership?.owner._id;
		}

		// Notes: keep the square brackets in [updateData] -> it's the pipelines for update query
		const updateData = options?.raw ? convertedData : [{ $set: convertedData }];
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > update > updateFilter :>> `, updateFilter);
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > update > updateData :>> `, updateData);

		const affectedIds = (await this.find(updateFilter, { ...options, select: ["_id"] })).map((item) => (item as any)._id);
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > update > affectedIds :>> `, affectedIds);

		const updateRes = await this.model.updateMany(updateFilter, updateData).exec();
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > update > updateRes :>> `, updateRes);

		// response > results
		const affectedItems = await this.find({ _id: { $in: affectedIds } }, options);
		if (options?.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > update > affectedItems :>> `, affectedItems);
		return updateRes.acknowledged ? affectedItems : [];
	}

	async updateOne(filter: IQueryFilter<T>, data: any, options: IQueryOptions = {}) {
		const results = await this.update(filter, data, { ...options, limit: 1 });
		return results && results.length > 0 ? results[0] : undefined;
	}

	async softDelete(filter?: IQueryFilter<T>, options: IQueryOptions = {}) {
		const data = { deletedAt: new Date(), deletedBy: this.ownership?.owner._id };
		const deletedItems = await this.update(filter, data, { deleted: true });
		if (options.isDebugging)
			console.log(`BaseService > "${this.model.collection.name}" > softDelete > deletedItems :>> `, deletedItems, deletedItems.length);
		return { ok: deletedItems.length > 0, affected: deletedItems.length };
	}

	async delete(filter?: IQueryFilter<T>, options: IQueryOptions = {}) {
		const deleteFilter = filter;
		const deleteRes = await this.model.deleteMany(deleteFilter).exec();
		if (options.isDebugging) console.log(`BaseService > "${this.model.collection.name}" > delete > deleteRes :>> `, deleteRes);
		return { ok: deleteRes.deletedCount > 0, affected: deleteRes.deletedCount };
	}

	async empty(filter?: IQueryFilter<T>) {
		if (filter?.pass != EMPTY_PASS_PHRASE) return { ok: 0, n: 0, error: "[DANGER] You need a password to process this, buddy!" };
		const deleteRes = await this.model.deleteMany({}).exec();
		return { ...deleteRes, error: null };
	}
}

export { BaseService };
