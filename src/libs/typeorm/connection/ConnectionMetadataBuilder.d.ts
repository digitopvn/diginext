import type { DataSource } from "../data-source/DataSource";
import type { EntitySchema } from "../entity-schema/EntitySchema";
import type { EntityMetadata } from "../metadata/EntityMetadata";
import type { MigrationInterface } from "../migration/MigrationInterface";
import type { EntitySubscriberInterface } from "../subscriber/EntitySubscriberInterface";
/**
 * Builds migration instances, subscriber instances and entity metadatas for the given classes.
 */
export declare class ConnectionMetadataBuilder {
    protected connection: DataSource;
    constructor(connection: DataSource);
    /**
     * Builds migration instances for the given classes or directories.
     */
    buildMigrations(migrations: (Function | string)[]): Promise<MigrationInterface[]>;
    /**
     * Builds subscriber instances for the given classes or directories.
     */
    buildSubscribers(subscribers: (Function | string)[]): Promise<EntitySubscriberInterface<any>[]>;
    /**
     * Builds entity metadatas for the given classes or directories.
     */
    buildEntityMetadatas(entities: (Function | EntitySchema<any> | string)[]): Promise<EntityMetadata[]>;
}
