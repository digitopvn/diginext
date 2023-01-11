import type { DataSource } from "../../data-source/DataSource";
import type { QueryRunner } from "../../query-runner/QueryRunner";
import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
import type { ColumnType } from "../types/ColumnTypes";
import type { ReplicationMode } from "../types/ReplicationMode";
import type { SqliteConnectionOptions } from "./SqliteConnectionOptions";
/**
 * Organizes communication with sqlite DBMS.
 */
export declare class SqliteDriver extends AbstractSqliteDriver {
    /**
     * Connection options.
     */
    options: SqliteConnectionOptions;

    /**
     * SQLite underlying library.
     */
    sqlite: any;
    constructor(connection: DataSource);
    /**
     * Closes connection with database.
     */
    disconnect(): Promise<void>;
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: ReplicationMode): QueryRunner;
    normalizeType(column: {
        type?: ColumnType;
        length?: number | string;
        precision?: number | null;
        scale?: number;
    }): string;
    afterConnect(): Promise<void>;
    /**
     * For SQLite, the database may be added in the decorator metadata. It will be a filepath to a database file.
     */
    buildTableName(tableName: string, _schema?: string, database?: string): string;
    /**
     * Creates connection with the database.
     */
    protected createDatabaseConnection(): Promise<any>;
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void;
    /**
     * Auto creates database directory if it does not exist.
     */
    protected createDatabaseDirectory(fullPath: string): Promise<void>;
    /**
     * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
     * during EntityMetadata production (see EntityMetadata#buildTablePath)
     *
     * https://sqlite.org/lang_attach.html
     */
    protected attachDatabases(): Promise<void>;
    protected getMainDatabasePath(): string;
}
