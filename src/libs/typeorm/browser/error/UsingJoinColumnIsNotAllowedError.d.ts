import type { EntityMetadata } from "../metadata/EntityMetadata";
import type { RelationMetadata } from "../metadata/RelationMetadata";
import { TypeORMError } from "./TypeORMError";
export declare class UsingJoinColumnIsNotAllowedError extends TypeORMError {
    constructor(entityMetadata: EntityMetadata, relation: RelationMetadata);
}
