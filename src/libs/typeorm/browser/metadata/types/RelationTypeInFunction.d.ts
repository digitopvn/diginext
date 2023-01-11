import type { EntityTarget } from "../../common/EntityTarget";
/**
 * Function that returns a type of the field. Returned value must be a class used on the relation.
 */
export declare type RelationTypeInFunction = ((type?: any) => Function) | EntityTarget<any>;
