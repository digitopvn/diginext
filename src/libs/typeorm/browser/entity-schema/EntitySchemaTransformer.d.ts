import type { MetadataArgsStorage } from "../metadata-args/MetadataArgsStorage";
import type { EntitySchema } from "./EntitySchema";
/**
 * Transforms entity schema into metadata args storage.
 * The result will be just like entities read from decorators.
 */
export declare class EntitySchemaTransformer {
    /**
     * Transforms entity schema into new metadata args storage object.
     */
    transform(schemas: EntitySchema<any>[]): MetadataArgsStorage;
    private transformColumnsRecursive;
}
