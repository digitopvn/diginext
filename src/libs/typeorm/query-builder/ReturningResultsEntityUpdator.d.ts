import type { ObjectLiteral } from "../common/ObjectLiteral";
import type { ColumnMetadata } from "../metadata/ColumnMetadata";
import type { QueryRunner } from "../query-runner/QueryRunner";
import type { QueryExpressionMap } from "./QueryExpressionMap";
import type { InsertResult } from "./result/InsertResult";
import type { UpdateResult } from "./result/UpdateResult";
/**
 * Updates entity with returning results in the entity insert and update operations.
 */
export declare class ReturningResultsEntityUpdator {
    protected queryRunner: QueryRunner;

    protected expressionMap: QueryExpressionMap;
    constructor(queryRunner: QueryRunner, expressionMap: QueryExpressionMap);
    /**
     * Updates entities with a special columns after updation query execution.
     */
    update(updateResult: UpdateResult, entities: ObjectLiteral[]): Promise<void>;
    /**
     * Updates entities with a special columns after insertion query execution.
     */
    insert(insertResult: InsertResult, entities: ObjectLiteral[]): Promise<void>;
    /**
     * Columns we need to be returned from the database when we update entity.
     */
    getUpdationReturningColumns(): ColumnMetadata[];
    /**
     * Columns we need to be returned from the database when we soft delete and restore entity.
     */
    getSoftDeletionReturningColumns(): ColumnMetadata[];
}
