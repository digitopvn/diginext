import type { ExclusionMetadata } from "../../metadata/ExclusionMetadata";
import type { TableExclusionOptions } from "../options/TableExclusionOptions";
/**
 * Database's table exclusion constraint stored in this class.
 */
export declare class TableExclusion {
    readonly "@instanceof": symbol;

    /**
     * Constraint name.
     */
    name?: string;

    /**
     * Exclusion expression.
     */
    expression?: string;
    constructor(options: TableExclusionOptions);
    /**
     * Creates a new copy of this constraint with exactly same properties.
     */
    clone(): TableExclusion;
    /**
     * Creates exclusions from the exclusion metadata object.
     */
    static create(exclusionMetadata: ExclusionMetadata): TableExclusion;
}
