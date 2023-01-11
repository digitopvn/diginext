import type { DataSource } from "../../data-source/DataSource";
import type { QueryRunner } from "../../query-runner/QueryRunner";
import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
import type { ReplicationMode } from "../types/ReplicationMode";
import type { ExpoConnectionOptions } from "./ExpoConnectionOptions";
export declare class ExpoDriver extends AbstractSqliteDriver {
    options: ExpoConnectionOptions;
    constructor(connection: DataSource);
    /**
     * Closes connection with database.
     */
    disconnect(): Promise<void>;
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: ReplicationMode): QueryRunner;
    /**
     * Creates connection with the database.
     */
    protected createDatabaseConnection(): Promise<void>;
}
