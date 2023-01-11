"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoEntityManager = void 0;
const EntityManager_1 = require("./EntityManager");
const DocumentToEntityTransformer_1 = require("../query-builder/transformer/DocumentToEntityTransformer");
const FindOptionsUtils_1 = require("../find-options/FindOptionsUtils");
const PlatformTools_1 = require("../platform/PlatformTools");
const InsertResult_1 = require("../query-builder/result/InsertResult");
const UpdateResult_1 = require("../query-builder/result/UpdateResult");
const DeleteResult_1 = require("../query-builder/result/DeleteResult");
const ObjectUtils_1 = require("../util/ObjectUtils");
const MongoUtils_1 = require("../util/MongoUtils");
/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 *
 * This implementation is used for MongoDB driver which has some specifics in its EntityManager.
 */
class MongoEntityManager extends EntityManager_1.EntityManager {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        super(connection);
        this["@instanceof"] = Symbol.for("MongoEntityManager");
    }
    get mongoQueryRunner() {
        return this.connection.driver
            .queryRunner;
    }
    // -------------------------------------------------------------------------
    // Overridden Methods
    // -------------------------------------------------------------------------
    /**
     * Finds entities that match given find options.
     */
    async find(entityClassOrName, options) {
        return this.executeFind(entityClassOrName, options);
    }
    /**
     * Finds entities that match given conditions.
     */
    async findBy(entityClassOrName, where) {
        return this.executeFind(entityClassOrName, where);
    }
    /**
     * Finds entities that match given find options.
     */
    async findAndCount(entityClassOrName, options) {
        return this.executeFindAndCount(entityClassOrName, options);
    }
    /**
     * Finds entities that match given where conditions.
     */
    async findAndCountBy(entityClassOrName, where) {
        return this.executeFindAndCount(entityClassOrName, where);
    }
    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     *
     * @deprecated use `findBy` method instead.
     */
    async findByIds(entityClassOrName, ids, optionsOrConditions) {
        console.log(`[DEPRECATED] "findByIds" > use "findBy" method instead`);
        const metadata = this.connection.getMetadata(entityClassOrName);
        const query = this.convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions) || {};
        const objectIdInstance = PlatformTools_1.PlatformTools.load("mongodb").ObjectID;
        query["_id"] = {
            $in: ids.map((id) => {
                if (typeof id === "string") {
                    return new objectIdInstance(id);
                }
                if (ObjectUtils_1.ObjectUtils.isObject(id)) {
                    if (id instanceof objectIdInstance) {
                        return id;
                    }
                    const propertyName = metadata.objectIdColumn.propertyName;
                    if (id[propertyName] instanceof objectIdInstance) {
                        return id[propertyName];
                    }
                }
            }),
        };
        const results = await this.executeFind(entityClassOrName, {
            ...optionsOrConditions,
            where: query,
        });
        return results;
        // const cursor = await this.createEntityCursor(entityClassOrName, query)
        // const deleteDateColumn =
        //     this.connection.getMetadata(entityClassOrName).deleteDateColumn
        // if (FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
        //     if (optionsOrConditions.select)
        //         cursor.project(
        //             this.convertFindOptionsSelectToProjectCriteria(
        //                 optionsOrConditions.select,
        //             ),
        //         )
        //     if (optionsOrConditions.skip) cursor.skip(optionsOrConditions.skip)
        //     if (optionsOrConditions.take) cursor.limit(optionsOrConditions.take)
        //     if (optionsOrConditions.order)
        //         cursor.sort(
        //             this.convertFindOptionsOrderToOrderCriteria(
        //                 optionsOrConditions.order,
        //             ),
        //         )
        //     if (deleteDateColumn && !optionsOrConditions.withDeleted) {
        //         this.filterSoftDeleted(cursor, deleteDateColumn, query)
        //     }
        // } else if (deleteDateColumn) {
        //     this.filterSoftDeleted(cursor, deleteDateColumn, query)
        // }
        // return await cursor.toArray()
    }
    /**
     * Finds first entity that matches given find options.
     */
    async findOne(entityClassOrName, options) {
        // return this.executeFindOne(entityClassOrName, options)
        const results = await this.executeFind(entityClassOrName, {
            ...options,
            take: 1,
        });
        return results.length > 0 ? results[0] : null;
    }
    /**
     * Finds first entity that matches given WHERE conditions.
     */
    async findOneBy(entityClassOrName, where) {
        // return this.executeFindOne(entityClassOrName, where)
        const results = await this.executeFind(entityClassOrName, {
            where: typeof where.where != "undefined" ? where.where : where,
            take: 1,
        });
        return results.length > 0 ? results[0] : null;
    }
    /**
     * Finds entity that matches given id.
     *
     * @deprecated use `findOneBy` method instead in conjunction with `In` operator, for example:
     *
     * .findOneBy({
     *     id: 1 // where "id" is your primary column name
     * })
     */
    async findOneById(entityClassOrName, id) {
        // return this.executeFindOne(entityClassOrName, id)
        console.log(`[DEPRECATED] use "findOneBy" method instead`);
        const objectIdInstance = PlatformTools_1.PlatformTools.load("mongodb").ObjectID;
        let _id;
        if (id instanceof objectIdInstance)
            _id = id;
        if (typeof id === "string" && (0, MongoUtils_1.isValidObjectId)(id))
            _id = new objectIdInstance(id);
        if (typeof _id == "undefined") {
            console.log(`_id is invalid.`);
            return null;
        }
        const results = await this.executeFind(entityClassOrName, {
            where: { _id },
            take: 1,
        });
        return results.length > 0 ? results[0] : null;
    }
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    async insert(target, entity) {
        // todo: convert entity to its database name
        const result = new InsertResult_1.InsertResult();
        if (Array.isArray(entity)) {
            result.raw = await this.insertMany(target, entity);
            Object.keys(result.raw.insertedIds).forEach((key) => {
                let insertedId = result.raw.insertedIds[key];
                result.generatedMaps.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), insertedId));
                result.identifiers.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), insertedId));
            });
        }
        else {
            result.raw = await this.insertOne(target, entity);
            result.generatedMaps.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), result.raw.insertedId));
            result.identifiers.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), result.raw.insertedId));
        }
        return result;
    }
    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    async update(target, criteria, partialEntity) {
        const result = new UpdateResult_1.UpdateResult();
        if (Array.isArray(criteria)) {
            const updateResults = await Promise.all(criteria.map((criteriaItem) => {
                return this.update(target, criteriaItem, partialEntity);
            }));
            result.raw = updateResults.map((r) => r.raw);
            result.affected = updateResults
                .map((r) => r.affected || 0)
                .reduce((c, r) => c + r, 0);
            result.generatedMaps = updateResults.reduce((c, r) => c.concat(r.generatedMaps), []);
        }
        else {
            const metadata = this.connection.getMetadata(target);
            const mongoResult = await this.updateMany(target, this.convertMixedCriteria(metadata, criteria), { $set: partialEntity });
            result.raw = mongoResult;
            result.affected = mongoResult.modifiedCount;
        }
        return result;
    }
    /**
     * Deletes entities by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    async delete(target, criteria) {
        const result = new DeleteResult_1.DeleteResult();
        if (Array.isArray(criteria)) {
            const deleteResults = await Promise.all(criteria.map((criteriaItem) => {
                return this.delete(target, criteriaItem);
            }));
            result.raw = deleteResults.map((r) => r.raw);
            result.affected = deleteResults
                .map((r) => r.affected || 0)
                .reduce((c, r) => c + r, 0);
        }
        else {
            const mongoResult = await this.deleteMany(target, this.convertMixedCriteria(this.connection.getMetadata(target), criteria));
            result.raw = mongoResult;
            result.affected = mongoResult.deletedCount;
        }
        return result;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     */
    createCursor(entityClassOrName, query) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.cursor(metadata.tableName, query);
    }
    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    createEntityCursor(entityClassOrName, query) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const cursor = this.createCursor(entityClassOrName, query);
        this.applyEntityTransformationToCursor(metadata, cursor, entityClassOrName);
        return cursor;
    }
    /**
     * Execute an aggregation framework pipeline against the collection.
     */
    aggregate(entityClassOrName, pipeline, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.aggregate(metadata.tableName, pipeline, options);
    }
    /**
     * Execute an aggregation framework pipeline against the collection.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    aggregateEntity(entityClassOrName, pipeline, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const cursor = this.mongoQueryRunner.aggregate(metadata.tableName, pipeline, options);
        this.applyEntityTransformationToCursor(metadata, cursor, entityClassOrName);
        return cursor;
    }
    /**
     * Perform a bulkWrite operation without a fluent API.
     */
    bulkWrite(entityClassOrName, operations, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.bulkWrite(metadata.tableName, operations, options);
    }
    /**
     * Count number of matching documents in the db to a query.
     */
    count(entityClassOrName, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.count(metadata.tableName, query, options);
    }
    /**
     * Count number of matching documents in the db to a query.
     */
    countBy(entityClassOrName, query, options) {
        return this.count(entityClassOrName, query, options);
    }
    /**
     * Creates an index on the db and collection.
     */
    createCollectionIndex(entityClassOrName, fieldOrSpec, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.createCollectionIndex(metadata.tableName, fieldOrSpec, options);
    }
    /**
     * Creates multiple indexes in the collection, this method is only supported for MongoDB 2.6 or higher.
     * Earlier version of MongoDB will throw a command not supported error.
     * Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.
     */
    createCollectionIndexes(entityClassOrName, indexSpecs) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.createCollectionIndexes(metadata.tableName, indexSpecs);
    }
    /**
     * Delete multiple documents on MongoDB.
     */
    deleteMany(entityClassOrName, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.deleteMany(metadata.tableName, query, options);
    }
    /**
     * Delete a document on MongoDB.
     */
    deleteOne(entityClassOrName, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.deleteOne(metadata.tableName, query, options);
    }
    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     */
    distinct(entityClassOrName, key, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.distinct(metadata.tableName, key, query, options);
    }
    /**
     * Drops an index from this collection.
     */
    dropCollectionIndex(entityClassOrName, indexName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.dropCollectionIndex(metadata.tableName, indexName, options);
    }
    /**
     * Drops all indexes from the collection.
     */
    dropCollectionIndexes(entityClassOrName) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.dropCollectionIndexes(metadata.tableName);
    }
    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndDelete(entityClassOrName, query, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.findOneAndDelete(metadata.tableName, query, options);
    }
    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndReplace(entityClassOrName, query, replacement, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.findOneAndReplace(metadata.tableName, query, replacement, options);
    }
    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndUpdate(entityClassOrName, query, update, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.findOneAndUpdate(metadata.tableName, query, update, options);
    }
    /**
     * Execute a geo search using a geo haystack index on a collection.
     */
    geoHaystackSearch(entityClassOrName, x, y, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.geoHaystackSearch(metadata.tableName, x, y, options);
    }
    /**
     * Execute the geoNear command to search for items in the collection.
     */
    geoNear(entityClassOrName, x, y, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.geoNear(metadata.tableName, x, y, options);
    }
    /**
     * Run a group command across a collection.
     */
    group(entityClassOrName, keys, condition, initial, reduce, finalize, command, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.group(metadata.tableName, keys, condition, initial, reduce, finalize, command, options);
    }
    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexes(entityClassOrName) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.collectionIndexes(metadata.tableName);
    }
    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexExists(entityClassOrName, indexes) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.collectionIndexExists(metadata.tableName, indexes);
    }
    /**
     * Retrieves this collections index info.
     */
    collectionIndexInformation(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.collectionIndexInformation(metadata.tableName, options);
    }
    /**
     * Initiate an In order bulk write operation, operations will be serially executed in the order they are added, creating a new operation for each switch in types.
     */
    initializeOrderedBulkOp(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.initializeOrderedBulkOp(metadata.tableName, options);
    }
    /**
     * Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
     */
    initializeUnorderedBulkOp(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.initializeUnorderedBulkOp(metadata.tableName, options);
    }
    /**
     * Inserts an array of documents into MongoDB.
     */
    insertMany(entityClassOrName, docs, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.insertMany(metadata.tableName, docs, options);
    }
    /**
     * Inserts a single document into MongoDB.
     */
    insertOne(entityClassOrName, doc, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.insertOne(metadata.tableName, doc, options);
    }
    /**
     * Returns if the collection is a capped collection.
     */
    isCapped(entityClassOrName) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.isCapped(metadata.tableName);
    }
    /**
     * Get the list of all indexes information for the collection.
     */
    listCollectionIndexes(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.listCollectionIndexes(metadata.tableName, options);
    }
    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     */
    mapReduce(entityClassOrName, map, reduce, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.mapReduce(metadata.tableName, map, reduce, options);
    }
    /**
     * Return N number of parallel cursors for a collection allowing parallel reading of entire collection.
     * There are no ordering guarantees for returned results.
     */
    parallelCollectionScan(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.parallelCollectionScan(metadata.tableName, options);
    }
    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    reIndex(entityClassOrName) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.reIndex(metadata.tableName);
    }
    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    rename(entityClassOrName, newName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.rename(metadata.tableName, newName, options);
    }
    /**
     * Replace a document on MongoDB.
     */
    replaceOne(entityClassOrName, query, doc, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.replaceOne(metadata.tableName, query, doc, options);
    }
    /**
     * Get all the collection statistics.
     */
    stats(entityClassOrName, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.stats(metadata.tableName, options);
    }
    watch(entityClassOrName, pipeline, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.watch(metadata.tableName, pipeline, options);
    }
    /**
     * Update multiple documents on MongoDB.
     */
    updateMany(entityClassOrName, query, update, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.updateMany(metadata.tableName, query, update, options);
    }
    /**
     * Update a single document on MongoDB.
     */
    updateOne(entityClassOrName, query, update, options) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.updateOne(metadata.tableName, query, update, options);
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Converts FindManyOptions to mongodb query.
     */
    convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions) {
        if (!optionsOrConditions)
            return undefined;
        if (FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions))
            // If where condition is passed as a string which contains sql we have to ignore
            // as mongo is not a sql database
            return typeof optionsOrConditions.where === "string"
                ? {}
                : optionsOrConditions.where;
        return optionsOrConditions;
    }
    /**
     * Converts FindOneOptions to mongodb query.
     */
    convertFindOneOptionsOrConditionsToMongodbQuery(optionsOrConditions) {
        if (!optionsOrConditions)
            return undefined;
        if (FindOptionsUtils_1.FindOptionsUtils.isFindOneOptions(optionsOrConditions))
            // If where condition is passed as a string which contains sql we have to ignore
            // as mongo is not a sql database
            return typeof optionsOrConditions.where === "string"
                ? {}
                : optionsOrConditions.where;
        return optionsOrConditions;
    }
    /**
     * Converts FindOptions into mongodb order by criteria.
     */
    convertFindOptionsOrderToOrderCriteria(order) {
        return Object.keys(order).reduce((orderCriteria, key) => {
            switch (order[key]) {
                case "DESC":
                    orderCriteria[key] = -1;
                    break;
                case "ASC":
                    orderCriteria[key] = 1;
                    break;
                default:
                    orderCriteria[key] = order[key];
            }
            return orderCriteria;
        }, {});
    }
    /**
     * Converts FindOptions into mongodb select by criteria.
     */
    convertFindOptionsSelectToProjectCriteria(selects) {
        if (Array.isArray(selects)) {
            const options = {};
            selects.map((select) => (options[select] = 1));
            return options;
            // return selects.reduce((projectCriteria, key) => {
            //     projectCriteria[key] = 1
            //     return projectCriteria
            // }, {} as any)
        }
        else {
            // todo: implement
            return selects;
        }
    }
    /**
     * Ensures given id is an id for query.
     */
    convertMixedCriteria(metadata, idMap) {
        const objectIdInstance = PlatformTools_1.PlatformTools.load("mongodb").ObjectID;
        // check first if it's ObjectId compatible:
        // string, number, Buffer, ObjectId or ObjectId-like
        if (objectIdInstance.isValid(idMap)) {
            return {
                _id: new objectIdInstance(idMap),
            };
        }
        // if it's some other type of object build a query from the columns
        // this check needs to be after the ObjectId check, because a valid ObjectId is also an Object instance
        if (ObjectUtils_1.ObjectUtils.isObject(idMap)) {
            return metadata.columns.reduce((query, column) => {
                const columnValue = column.getEntityValue(idMap);
                if (columnValue !== undefined)
                    query[column.databasePath] = columnValue;
                return query;
            }, {});
        }
        // last resort: try to convert it to an ObjectID anyway
        // most likely it will fail, but we want to be backwards compatible and keep the same thrown Errors.
        // it can still pass with null/undefined
        return {
            _id: new objectIdInstance(idMap),
        };
    }
    /**
     * Overrides cursor's toArray and next methods to convert results to entity automatically.
     */
    applyEntityTransformationToCursor(metadata, cursor, entityClassOrName) {
        // mongdb-3.7 exports Cursor, mongodb-4.2 exports FindCursor, provide support for both.
        const ParentCursor = PlatformTools_1.PlatformTools.load("mongodb").Cursor ||
            PlatformTools_1.PlatformTools.load("mongodb").FindCursor;
        const queryRunner = this.mongoQueryRunner;
        cursor.toArray = function (callback) {
            if (callback) {
                ParentCursor.prototype.toArray.call(this, (error, results) => {
                    if (error) {
                        callback(error, results);
                        return;
                    }
                    const transformer = new DocumentToEntityTransformer_1.DocumentToEntityTransformer(entityClassOrName);
                    const entities = transformer.transformAll(results, metadata);
                    // broadcast "load" events
                    queryRunner.broadcaster
                        .broadcast("Load", metadata, entities)
                        .then(() => callback(error, entities));
                });
            }
            else {
                return ParentCursor.prototype.toArray
                    .call(this)
                    .then((results) => {
                        const transformer = new DocumentToEntityTransformer_1.DocumentToEntityTransformer(entityClassOrName);
                        const entities = transformer.transformAll(results, metadata);
                        // broadcast "load" events
                        return queryRunner.broadcaster
                            .broadcast("Load", metadata, entities)
                            .then(() => entities);
                    });
            }
        };
        cursor.next = function (callback) {
            if (callback) {
                ParentCursor.prototype.next.call(this, (error, result) => {
                    if (error || !result) {
                        callback(error, result);
                        return;
                    }
                    const transformer = new DocumentToEntityTransformer_1.DocumentToEntityTransformer(entityClassOrName);
                    const entity = transformer.transform(result, metadata);
                    // broadcast "load" events
                    queryRunner.broadcaster
                        .broadcast("Load", metadata, [entity])
                        .then(() => callback(error, entity));
                });
            }
            else {
                return ParentCursor.prototype.next
                    .call(this)
                    .then((result) => {
                        if (!result)
                            return result;
                        const transformer = new DocumentToEntityTransformer_1.DocumentToEntityTransformer(entityClassOrName);
                        const entity = transformer.transform(result, metadata);
                        // broadcast "load" events
                        return queryRunner.broadcaster
                            .broadcast("Load", metadata, [entity])
                            .then(() => entity);
                    });
            }
        };
    }
    filterSoftDeleted(cursor, deleteDateColumn, query) {
        const { $or, ...restQuery } = query !== null && query !== void 0 ? query : {};
        cursor.filter({
            $or: [
                { [deleteDateColumn.propertyName]: { $eq: null } },
                ...(Array.isArray($or) ? $or : []),
            ],
            ...restQuery,
        });
    }
    /**
     * Finds first entity that matches given conditions and/or find options.
     */
    async executeFindOne(entityClassOrName, optionsOrConditions, maybeOptions) {
        const objectIdInstance = PlatformTools_1.PlatformTools.load("mongodb").ObjectID;
        const id = optionsOrConditions instanceof objectIdInstance ||
            typeof optionsOrConditions === "string"
            ? optionsOrConditions
            : undefined;
        const findOneOptionsOrConditions = (id ? maybeOptions : optionsOrConditions);
        const query = this.convertFindOneOptionsOrConditionsToMongodbQuery(findOneOptionsOrConditions) || {};
        if (id) {
            query["_id"] =
                id instanceof objectIdInstance ? id : new objectIdInstance(id);
        }
        const cursor = await this.createEntityCursor(entityClassOrName, query);
        const deleteDateColumn = this.connection.getMetadata(entityClassOrName).deleteDateColumn;
        if (FindOptionsUtils_1.FindOptionsUtils.isFindOneOptions(findOneOptionsOrConditions)) {
            if (findOneOptionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(findOneOptionsOrConditions.select));
            if (findOneOptionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(findOneOptionsOrConditions.order));
            if (deleteDateColumn && !findOneOptionsOrConditions.withDeleted) {
                this.filterSoftDeleted(cursor, deleteDateColumn, query);
            }
        }
        else if (deleteDateColumn) {
            this.filterSoftDeleted(cursor, deleteDateColumn, query);
        }
        // const result = await cursor.limit(1).next();
        const result = await cursor.limit(1).toArray();
        return result.length > 0 ? result[0] : null;
    }
    async executeFind(entityClassOrName, optionsOrConditions) {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const deleteDateColumn = this.connection.getMetadata(entityClassOrName).deleteDateColumn;
        const query = this.convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions);
        const objectIdInstance = PlatformTools_1.PlatformTools.load("mongodb").ObjectID;
        if (query === null || query === void 0 ? void 0 : query.id) {
            query["_id"] =
                (query === null || query === void 0 ? void 0 : query.id) instanceof objectIdInstance
                    ? query === null || query === void 0 ? void 0 : query.id
                    : new objectIdInstance(query === null || query === void 0 ? void 0 : query.id);
            query === null || query === void 0 ? true : delete query.id;
        }
        const pipeline = [];
        let populate = [];
        let results;
        let firstPipeline;
        const { referenceColumns } = this.parseColumns(metadata);
        // console.log("referenceColumns", referenceColumns)
        const refColumnNames = referenceColumns.map((col) => col.propertyName);
        const refTables = referenceColumns.map((col) => {
            return {
                [`${col.propertyName}`]: {
                    name: col.databaseName,
                    isArray: col.isArray,
                },
            };
        });
        // console.dir(refTables, { depth: 5 })
        if (FindOptionsUtils_1.FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (query) {
                firstPipeline = { $match: query };
                pipeline.push(firstPipeline);
            }
            // relations / populate
            if (optionsOrConditions.relations) {
                let lookups = [];
                for (const field in optionsOrConditions.relations) {
                    populate.push(field);
                    const fieldIndex = refColumnNames.findIndex((name) => name == field);
                    if (fieldIndex > -1) {
                        const refTable = refTables[fieldIndex][field].name;
                        const populateLookup = {
                            $lookup: {
                                from: refTable,
                                localField: field,
                                foreignField: "_id",
                                as: field,
                            },
                        };
                        lookups.push(populateLookup);
                    }
                    else {
                        console.log(`Populated field "${field}" is not valid.`);
                    }
                }
                lookups = lookups.filter((lookup) => lookup != undefined && lookup != null);
                pipeline.push(...lookups);
                // TODO: populate and select specific fields to display only
            }
            if (optionsOrConditions.select) {
                const selectWithProjectPipeline = {
                    $project: this.convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select),
                };
                pipeline.push(selectWithProjectPipeline);
                // console.log(selectWithProjectPipeline)
            }
            if (optionsOrConditions.skip)
                pipeline.push({ $skip: optionsOrConditions.skip });
            if (optionsOrConditions.take)
                pipeline.push({ $limit: optionsOrConditions.take });
            if (optionsOrConditions.order) {
                pipeline.push({
                    $sort: this.convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order),
                });
            }
            if (deleteDateColumn && !optionsOrConditions.withDeleted) {
                if (firstPipeline) {
                    if (firstPipeline.$match) {
                        const $or = firstPipeline.$match.$or || [];
                        firstPipeline.$match.$or = [
                            { [deleteDateColumn.propertyName]: { $eq: null } },
                            ...(Array.isArray($or) ? $or : []),
                        ];
                    }
                    else {
                        pipeline.unshift({
                            $match: {
                                $or: [
                                    {
                                        [deleteDateColumn.propertyName]: {
                                            $eq: null,
                                        },
                                    },
                                ],
                            },
                        });
                    }
                }
                else {
                    pipeline.push({
                        $match: {
                            $or: [
                                {
                                    [deleteDateColumn.propertyName]: {
                                        $eq: null,
                                    },
                                },
                            ],
                        },
                    });
                }
            }
        }
        else if (deleteDateColumn) {
            pipeline.push({
                $match: {
                    $or: [
                        {
                            [deleteDateColumn.propertyName]: {
                                $eq: null,
                            },
                        },
                    ],
                },
            });
        }
        // console.dir(pipeline, { depth: null })
        results = await this.aggregateEntity(entityClassOrName, pipeline).toArray();
        
        // "aggregate" always returns array
        // if the relation column is not an array, we should return an object
        
        // console.dir(refTables, { depth: 5 })
        // console.dir({ results }, { depth: 5 });

        results = results.map((result) => {
            populate.forEach((column) => {
                const metadata = refTables.find(ref => ref[column]);
                if (!metadata[column].isArray) result[column] = result[column][0];
            });
            return result;
        });
        // console.dir(results, { depth: null })
        
        // transform document to entity
        return results;
        // const query =
        //     this.convertFindManyOptionsOrConditionsToMongodbQuery(
        //         optionsOrConditions,
        //     )
        // const cursor = await this.createEntityCursor(entityClassOrName, query)
        // const deleteDateColumn =
        //     this.connection.getMetadata(entityClassOrName).deleteDateColumn
        // if (FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
        //     if (optionsOrConditions.select)
        //         cursor.project(
        //             this.convertFindOptionsSelectToProjectCriteria(
        //                 optionsOrConditions.select,
        //             ),
        //         )
        //     if (optionsOrConditions.skip) cursor.skip(optionsOrConditions.skip)
        //     if (optionsOrConditions.take) cursor.limit(optionsOrConditions.take)
        //     if (optionsOrConditions.order)
        //         cursor.sort(
        //             this.convertFindOptionsOrderToOrderCriteria(
        //                 optionsOrConditions.order,
        //             ),
        //         )
        //     if (deleteDateColumn && !optionsOrConditions.withDeleted) {
        //         this.filterSoftDeleted(cursor, deleteDateColumn, query)
        //     }
        // } else if (deleteDateColumn) {
        //     this.filterSoftDeleted(cursor, deleteDateColumn, query)
        // }
        // return cursor.toArray()
    }
    /**
     * Read entity's metadata to parse columns that references to other table (collection)
     */
    parseColumns(metadata) {
        const _columns = metadata.columns.map(({ isObjectId, isArray, isVirtual, type, databaseName, databasePath, propertyName, propertyAliasName, propertyPath, }) => {
            return {
                type,
                isObjectId,
                isArray,
                isVirtual,
                databaseName,
                databasePath,
                propertyName,
                propertyPath,
                propertyAliasName,
            };
        });
        const normalColumns = _columns.filter((col) => col.type || col.databaseName == "_id");
        const referenceColumns = _columns.filter((col) => col.isObjectId && col.databaseName != "_id");
        const columns = [...normalColumns, ...referenceColumns];
        return { columns, normalColumns, referenceColumns };
    }
    /**
     * Finds entities that match given find options or conditions.
     */
    async executeFindAndCount(entityClassOrName, optionsOrConditions) {
        const [results, count] = await Promise.all([
            this.find(entityClassOrName, optionsOrConditions),
            this.count(entityClassOrName),
        ]);
        return [results, parseInt(count)];
    }
}
exports.MongoEntityManager = MongoEntityManager;

//# sourceMappingURL=MongoEntityManager.js.map
