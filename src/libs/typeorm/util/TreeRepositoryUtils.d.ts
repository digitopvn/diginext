import type { EntityManager } from "../entity-manager/EntityManager";
import type { EntityMetadata } from "../metadata/EntityMetadata";
import type { FindTreesOptions } from "../repository/FindTreesOptions";
/**
 * Provides utilities for manipulating tree structures.
 *
 */
export declare class TreeRepositoryUtils {
    static createRelationMaps(manager: EntityManager, metadata: EntityMetadata, alias: string, rawResults: any[]): {
        id: any;
        parentId: any;
    }[];
    static buildChildrenEntityTree(metadata: EntityMetadata, entity: any, entities: any[], relationMaps: {
        id: any;
        parentId: any;
    }[], options: FindTreesOptions & {
        depth: number;
    }): void;
    static buildParentEntityTree(metadata: EntityMetadata, entity: any, entities: any[], relationMaps: {
        id: any;
        parentId: any;
    }[]): void;
}
