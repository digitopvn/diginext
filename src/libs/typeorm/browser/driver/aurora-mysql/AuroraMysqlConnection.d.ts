import type { DataSourceOptions } from "../../data-source";
import { DataSource } from "../../data-source/DataSource";
import type { QueryRunner } from "../../query-runner/QueryRunner";
import type { ReplicationMode } from "../types/ReplicationMode";
import type { AuroraMysqlQueryRunner } from "./AuroraMysqlQueryRunner";
/**
 * Organizes communication with MySQL DBMS.
 */
export declare class AuroraMysqlConnection extends DataSource {
    queryRunner: AuroraMysqlQueryRunner;
    constructor(options: DataSourceOptions, queryRunner: AuroraMysqlQueryRunner);
    createQueryRunner(mode: ReplicationMode): QueryRunner;
}
