import type { ObjectLiteral } from "../../common/ObjectLiteral";
import type { DataSource } from "../../data-source/DataSource";
import type { EntityManager } from "../../entity-manager/EntityManager";
import type { ColumnMetadata } from "../../metadata/ColumnMetadata";
import type { EntityMetadata } from "../../metadata/EntityMetadata";
import type { RelationMetadata } from "../../metadata/RelationMetadata";
import type { QueryRunner } from "../../query-runner/QueryRunner";
/**
 * UpdateEvent is an object that broadcaster sends to the entity subscriber when entity is being updated in the database.
 */
export interface UpdateEvent<Entity> {
    /**
     * Connection used in the event.
     */
    connection: DataSource;
    /**
     * QueryRunner used in the event transaction.
     * All database operations in the subscribed event listener should be performed using this query runner instance.
     */
    queryRunner: QueryRunner;
    /**
     * EntityManager used in the event transaction.
     * All database operations in the subscribed event listener should be performed using this entity manager instance.
     */
    manager: EntityManager;
    /**
     * Updating entity.
     */
    entity: ObjectLiteral | undefined;
    /**
     * Metadata of the entity.
     */
    metadata: EntityMetadata;
    /**
     * Updating entity in the database.
     */
    databaseEntity: Entity;
    /**
     * List of updated columns. In query builder has no affected
     */
    updatedColumns: ColumnMetadata[];
    /**
     * List of updated relations. In query builder has no affected
     */
    updatedRelations: RelationMetadata[];
}
