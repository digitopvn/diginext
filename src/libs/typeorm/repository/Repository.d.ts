import type { DeepPartial } from "../common/DeepPartial";
import type { EntityTarget } from "../common/EntityTarget";
import type { ObjectLiteral } from "../common/ObjectLiteral";
import type { ObjectID } from "../driver/mongodb/typings";
import type { EntityManager } from "../entity-manager/EntityManager";
import type { FindManyOptions } from "../find-options/FindManyOptions";
import type { FindOneOptions } from "../find-options/FindOneOptions";
import type { FindOptionsWhere } from "../find-options/FindOptionsWhere";
import type { QueryDeepPartialEntity } from "../query-builder/QueryPartialEntity";
import type { DeleteResult } from "../query-builder/result/DeleteResult";
import type { InsertResult } from "../query-builder/result/InsertResult";
import type { UpdateResult } from "../query-builder/result/UpdateResult";
import type { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import type { QueryRunner } from "../query-runner/QueryRunner";
import type { RemoveOptions } from "./RemoveOptions";
import type { SaveOptions } from "./SaveOptions";
import type { UpsertOptions } from "./UpsertOptions";
/**
 * Repository is supposed to work with your entity objects. Find entities, insert, update, delete, etc.
 */
export declare class Repository<Entity extends ObjectLiteral> {
    /**
     * Entity target that is managed by this repository.
     * If this repository manages entity from schema,
     * then it returns a name of that schema instead.
     */
    readonly target: EntityTarget<Entity>;

    /**
     * Entity Manager used by this repository.
     */
    readonly manager: EntityManager;

    /**
     * Query runner provider used for this repository.
     */
    readonly queryRunner?: QueryRunner;
    /**
     * Entity metadata of the entity current repository manages.
     */
    get metadata(): import("..").EntityMetadata;
    constructor(target: EntityTarget<Entity>, manager: EntityManager, queryRunner?: QueryRunner);
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder(alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity>;
    /**
     * Checks if entity has an id.
     * If entity composite compose ids, it will check them all.
     */
    hasId(entity: Entity): boolean;
    /**
     * Gets entity mixed id.
     */
    getId(entity: Entity): any;
    /**
     * Creates a new entity instance.
     */
    create(): Entity;
    /**
     * Creates new entities and copies all entity properties from given objects into their new entities.
     * Note that it copies only properties that are present in entity schema.
     */
    create(entityLikeArray: DeepPartial<Entity>[]): Entity[];
    /**
     * Creates a new entity instance and copies all entity properties from this object into a new entity.
     * Note that it copies only properties that are present in entity schema.
     */
    create(entityLike: DeepPartial<Entity>): Entity;
    /**
     * Merges multiple entities (or entity-like objects) into a given entity.
     */
    merge(mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity;
    /**
     * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     *
     * Note that given entity-like object must have an entity id / primary key to find entity by.
     * Returns undefined if entity with given id was not found.
     */
    preload(entityLike: DeepPartial<Entity>): Promise<Entity | undefined>;
    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & {
        reload: false;
    }): Promise<T[]>;
    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & {
        reload: false;
    }): Promise<T>;
    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;
    /**
     * Removes a given entities from the database.
     */
    remove(entities: Entity[], options?: RemoveOptions): Promise<Entity[]>;
    /**
     * Removes a given entity from the database.
     */
    remove(entity: Entity, options?: RemoveOptions): Promise<Entity>;
    /**
     * Records the delete date of all given entities.
     */
    softRemove<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & {
        reload: false;
    }): Promise<T[]>;
    /**
     * Records the delete date of all given entities.
     */
    softRemove<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
    /**
     * Records the delete date of a given entity.
     */
    softRemove<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & {
        reload: false;
    }): Promise<T>;
    /**
     * Records the delete date of a given entity.
     */
    softRemove<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;
    /**
     * Recovers all given entities in the database.
     */
    recover<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & {
        reload: false;
    }): Promise<T[]>;
    /**
     * Recovers all given entities in the database.
     */
    recover<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
    /**
     * Recovers a given entity in the database.
     */
    recover<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & {
        reload: false;
    }): Promise<T>;
    /**
     * Recovers a given entity in the database.
     */
    recover<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     */
    insert(entity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<InsertResult>;
    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    update(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult>;
    /**
     * Inserts a given entity into the database, unless a unique constraint conflicts then updates the entity
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT ... ON CONFLICT DO UPDATE/ON DUPLICATE KEY UPDATE query.
     */
    upsert(entityOrEntities: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[], conflictPathsOrOptions: string[] | UpsertOptions<Entity>): Promise<InsertResult>;
    /**
     * Deletes entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    delete(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>): Promise<DeleteResult>;
    /**
     * Records the delete date of entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient SOFT-DELETE query.
     * Does not check if entity exist in the database.
     */
    softDelete(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>): Promise<UpdateResult>;
    /**
     * Restores entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient SOFT-DELETE query.
     * Does not check if entity exist in the database.
     */
    restore(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>): Promise<UpdateResult>;
    /**
     * Counts entities that match given options.
     * Useful for pagination.
     */
    count(options?: FindManyOptions<Entity>): Promise<number>;
    /**
     * Counts entities that match given conditions.
     * Useful for pagination.
     */
    countBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number>;
    /**
     * Finds entities that match given find options.
     */
    find(options?: FindManyOptions<Entity>): Promise<Entity[]>;
    /**
     * Finds entities that match given find options.
     */
    findBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity[]>;
    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]>;
    /**
     * Finds entities that match given WHERE conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCountBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<[Entity[], number]>;
    /**
     * Finds entities with ids.
     * Optionally find options or conditions can be applied.
     *
     * @deprecated use `findBy` method instead in conjunction with `In` operator, for example:
     *
     * .findBy({
     *     id: In([1, 2, 3])
     * })
     */
    findByIds(ids: any[]): Promise<Entity[]>;
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - returns null.
     */
    findOne(options: FindOneOptions<Entity>): Promise<Entity | null>;
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - returns null.
     */
    findOneBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity | null>;
    /**
     * Finds first entity that matches given id.
     * If entity was not found in the database - returns null.
     *
     * @deprecated use `findOneBy` method instead in conjunction with `In` operator, for example:
     *
     * .findOneBy({
     *     id: 1 // where "id" is your primary column name
     * })
     */
    findOneById(id: number | string | Date | ObjectID): Promise<Entity | null>;
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - rejects with error.
     */
    findOneOrFail(options: FindOneOptions<Entity>): Promise<Entity>;
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - rejects with error.
     */
    findOneByOrFail(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity>;
    /**
     * Executes a raw SQL query and returns a raw database results.
     * Raw query execution is supported only by relational databases (MongoDB is not supported).
     */
    query(query: string, parameters?: any[]): Promise<any>;
    /**
     * Clears all the data from the given table/collection (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    clear(): Promise<void>;
    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    increment(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number | string): Promise<UpdateResult>;
    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    decrement(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number | string): Promise<UpdateResult>;
    /**
     * Extends repository with provided functions.
     */
    extend<CustomRepository>(custom: CustomRepository & ThisType<Repository<Entity> & CustomRepository>): Repository<Entity> & CustomRepository;
}
