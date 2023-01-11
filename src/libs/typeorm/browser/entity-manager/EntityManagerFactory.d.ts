import type { DataSource } from "../data-source/DataSource";
import type { QueryRunner } from "../query-runner/QueryRunner";
import type { EntityManager } from "./EntityManager";
/**
 * Helps to create entity managers.
 */
export declare class EntityManagerFactory {
    /**
     * Creates a new entity manager depend on a given connection's driver.
     */
    create(connection: DataSource, queryRunner?: QueryRunner): EntityManager;
}
