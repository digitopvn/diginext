import type { DataSource } from "../../data-source/DataSource";
import type { QueryRunner } from "../../query-runner/QueryRunner";
import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
import type { ReplicationMode } from "../types/ReplicationMode";
import type { ReactNativeConnectionOptions } from "./ReactNativeConnectionOptions";
export declare class ReactNativeDriver extends AbstractSqliteDriver {
    options: ReactNativeConnectionOptions;
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
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void;
}
