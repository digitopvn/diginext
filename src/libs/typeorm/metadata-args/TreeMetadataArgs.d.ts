import type { ClosureTreeOptions } from "../metadata/types/ClosureTreeOptions";
import type { TreeType } from "../metadata/types/TreeTypes";
/**
 * Stores metadata collected for Tree entities.
 */
export interface TreeMetadataArgs {
    /**
     * Entity to which tree is applied.
     */
    target: Function | string;
    /**
     * Tree type.
     */
    type: TreeType;
    /**
     * Tree options
     */
    options?: ClosureTreeOptions;
}
