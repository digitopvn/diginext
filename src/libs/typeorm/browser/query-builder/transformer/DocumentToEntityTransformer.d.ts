import type { EntityTarget } from "../../common/EntityTarget";
import type { ObjectLiteral } from "../../common/ObjectLiteral";
import type { EntityMetadata } from "../../metadata/EntityMetadata";
/**
 * Transforms raw document into entity object.
 * Entity is constructed based on its entity metadata.
 */
export declare class DocumentToEntityTransformer {
    entity: EntityTarget<ObjectLiteral>;
    constructor(entityClassOrName: EntityTarget<ObjectLiteral>);
    transformAll(documents: ObjectLiteral[], metadata: EntityMetadata): any[];
    transform(document: any, metadata: EntityMetadata): any;
}
