import type { DataSource, EntitySchemaEmbeddedColumnOptions, SelectQueryBuilder } from "..";
import type { OrderByCondition } from "../find-options/OrderByCondition";
import type { TableType } from "../metadata/types/TableTypes";
import type { EntitySchemaCheckOptions } from "./EntitySchemaCheckOptions";
import type { EntitySchemaColumnOptions } from "./EntitySchemaColumnOptions";
import type { EntitySchemaExclusionOptions } from "./EntitySchemaExclusionOptions";
import type { EntitySchemaIndexOptions } from "./EntitySchemaIndexOptions";
import type { EntitySchemaRelationIdOptions } from "./EntitySchemaRelationIdOptions";
import type { EntitySchemaRelationOptions } from "./EntitySchemaRelationOptions";
import type { EntitySchemaUniqueOptions } from "./EntitySchemaUniqueOptions";
/**
 * Interface for entity metadata mappings stored inside "schemas" instead of models decorated by decorators.
 */
export declare class EntitySchemaOptions<T> {
    /**
     * Name of the schema it extends.
     */
    extends?: string;

    /**
     * Target bind to this entity schema. Optional.
     */
    target?: Function;

    /**
     * Entity name.
     */
    name: string;

    /**
     * Table name.
     */
    tableName?: string;

    /**
     * Database name. Used in MySql and Sql Server.
     */
    database?: string;

    /**
     * Schema name. Used in Postgres and Sql Server.
     */
    schema?: string;

    /**
     * Table type.
     */
    type?: TableType;

    /**
     * Specifies a property name by which queries will perform ordering by default when fetching rows.
     */
    orderBy?: OrderByCondition;

    /**
     * Entity column's options.
     */
    columns: {
        [P in keyof T]?: EntitySchemaColumnOptions;
    };

    /**
     * Entity relation's options.
     */
    relations?: {
        [P in keyof T]?: EntitySchemaRelationOptions;
    };

    /**
     * Entity relation id options.
     */
    relationIds?: {
        [P in keyof T]?: EntitySchemaRelationIdOptions;
    };

    /**
     * Entity indices options.
     */
    indices?: EntitySchemaIndexOptions[];

    /**
     * Entity uniques options.
     */
    uniques?: EntitySchemaUniqueOptions[];

    /**
     * Entity check options.
     */
    checks?: EntitySchemaCheckOptions[];

    /**
     * Entity exclusion options.
     */
    exclusions?: EntitySchemaExclusionOptions[];

    /**
     * Embedded Entities options
     */
    embeddeds?: {
        [P in keyof Partial<T>]: EntitySchemaEmbeddedColumnOptions;
    };

    /**
     * Indicates if schema synchronization is enabled or disabled for this entity.
     * If it will be set to false then schema sync will and migrations ignore this entity.
     * By default schema synchronization is enabled for all entities.
     */
    synchronize?: boolean;

    /**
     * If set to 'true' this option disables Sqlite's default behaviour of secretly creating
     * an integer primary key column named 'rowid' on table creation.
     * @see https://www.sqlite.org/withoutrowid.html.
     */
    withoutRowid?: boolean;

    /**
     * View expression.
     */
    expression?: string | ((connection: DataSource) => SelectQueryBuilder<any>);
}
