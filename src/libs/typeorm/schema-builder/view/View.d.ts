import type { DataSource, Driver, EntityMetadata, SelectQueryBuilder } from "../..";
import type { ViewOptions } from "../options/ViewOptions";
/**
 * View in the database represented in this class.
 */
export declare class View {
    readonly "@instanceof": symbol;

    /**
     * Database name that this view resides in if it applies.
     */
    database?: string;

    /**
     * Schema name that this view resides in if it applies.
     */
    schema?: string;

    /**
     * View name
     */
    name: string;

    /**
     * Indicates if view is materialized.
     */
    materialized: boolean;

    /**
     * View definition.
     */
    expression: string | ((connection: DataSource) => SelectQueryBuilder<any>);
    constructor(options?: ViewOptions);
    /**
     * Clones this table to a new table with all properties cloned.
     */
    clone(): View;
    /**
     * Creates view from a given entity metadata.
     */
    static create(entityMetadata: EntityMetadata, driver: Driver): View;
}
