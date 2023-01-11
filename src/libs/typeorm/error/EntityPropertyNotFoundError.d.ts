import type { EntityMetadata } from "../metadata/EntityMetadata";
import { TypeORMError } from "./TypeORMError";
/**
 * Thrown when specified entity property was not found.
 */
export declare class EntityPropertyNotFoundError extends TypeORMError {
    constructor(propertyPath: string, metadata: EntityMetadata);
}
