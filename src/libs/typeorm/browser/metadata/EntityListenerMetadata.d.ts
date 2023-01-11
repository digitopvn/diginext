import type { ObjectLiteral } from "../common/ObjectLiteral";
import type { EntityListenerMetadataArgs } from "../metadata-args/EntityListenerMetadataArgs";
import type { EmbeddedMetadata } from "./EmbeddedMetadata";
import type { EntityMetadata } from "./EntityMetadata";
import type { EventListenerType } from "./types/EventListenerTypes";
/**
 * This metadata contains all information about entity's listeners.
 */
export declare class EntityListenerMetadata {
    /**
     * Entity metadata of the listener.
     */
    entityMetadata: EntityMetadata;

    /**
     * Embedded metadata of the listener, in the case if listener is in embedded.
     */
    embeddedMetadata?: EmbeddedMetadata;

    /**
     * Target class to which metadata is applied.
     * This can be different then entityMetadata.target in the case if listener is in the embedded.
     */
    target: Function | string;

    /**
     * Target's property name to which this metadata is applied.
     */
    propertyName: string;

    /**
     * The type of the listener.
     */
    type: EventListenerType;
    constructor(options: {
        entityMetadata: EntityMetadata;
        embeddedMetadata?: EmbeddedMetadata;
        args: EntityListenerMetadataArgs;
    });
    /**
     * Checks if entity listener is allowed to be executed on the given entity.
     */
    isAllowed(entity: ObjectLiteral): boolean;
    /**
     * Executes listener method of the given entity.
     */
    execute(entity: ObjectLiteral): any;
    /**
     * Calls embedded entity listener method no matter how nested it is.
     */
    protected callEntityEmbeddedMethod(entity: ObjectLiteral, propertyPaths: string[]): void;
}
