import type { DataSource } from "../../data-source/DataSource";
import type { QueryRunner } from "../../query-runner/QueryRunner";
import type { RelationIdAttribute } from "./RelationIdAttribute";
import type { RelationIdLoadResult } from "./RelationIdLoadResult";
export declare class RelationIdLoader {
    protected connection: DataSource;

    protected queryRunner: QueryRunner | undefined;

    protected relationIdAttributes: RelationIdAttribute[];
    constructor(connection: DataSource, queryRunner: QueryRunner | undefined, relationIdAttributes: RelationIdAttribute[]);
    load(rawEntities: any[]): Promise<RelationIdLoadResult[]>;
}
