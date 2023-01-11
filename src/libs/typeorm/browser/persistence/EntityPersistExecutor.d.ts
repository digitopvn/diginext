import type { ObjectLiteral } from "../common/ObjectLiteral";
import type { DataSource } from "../data-source/DataSource";
import type { QueryRunner } from "../query-runner/QueryRunner";
import type { RemoveOptions } from "../repository/RemoveOptions";
import type { SaveOptions } from "../repository/SaveOptions";
/**
 * Persists a single entity or multiple entities - saves or removes them.
 */
export declare class EntityPersistExecutor {
    protected connection: DataSource;

    protected queryRunner: QueryRunner | undefined;

    protected mode: "save" | "remove" | "soft-remove" | "recover";

    protected target: Function | string | undefined;

    protected entity: ObjectLiteral | ObjectLiteral[];

    protected options?: (SaveOptions & RemoveOptions) | undefined;
    constructor(connection: DataSource, queryRunner: QueryRunner | undefined, mode: "save" | "remove" | "soft-remove" | "recover", target: Function | string | undefined, entity: ObjectLiteral | ObjectLiteral[], options?: (SaveOptions & RemoveOptions) | undefined);
    /**
     * Executes persistence operation ob given entity or entities.
     */
    execute(): Promise<void>;
}
