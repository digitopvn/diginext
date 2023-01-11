import type { DataSource } from "../../data-source/DataSource";
import type { QueryRunner } from "../../query-runner/QueryRunner";
import type { RelationCountAttribute } from "./RelationCountAttribute";
import type { RelationCountLoadResult } from "./RelationCountLoadResult";
export declare class RelationCountLoader {
    protected connection: DataSource;

    protected queryRunner: QueryRunner | undefined;

    protected relationCountAttributes: RelationCountAttribute[];
    constructor(connection: DataSource, queryRunner: QueryRunner | undefined, relationCountAttributes: RelationCountAttribute[]);
    load(rawEntities: any[]): Promise<RelationCountLoadResult[]>;
}
