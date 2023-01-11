
import type { ObjectID } from "../driver/mongodb/typings";
import type { EqualOperator } from "./EqualOperator";
import type { FindOperator } from "./FindOperator";
/**
 * A single property handler for FindOptionsWhere.
 */
export declare type FindOptionsWhereProperty<Property> = Property extends Promise<infer I> ? FindOptionsWhereProperty<NonNullable<I>> : Property extends Array<infer I> ? FindOptionsWhereProperty<NonNullable<I>> : Property extends Function ? never : Property extends Buffer ? Property | FindOperator<Property> : Property extends Date ? Property | FindOperator<Property> : Property extends ObjectID ? Property | FindOperator<Property> : Property extends object ? FindOptionsWhere<Property> | FindOptionsWhere<Property>[] | EqualOperator<Property> | FindOperator<any> | boolean : Property | FindOperator<Property>;
/** :
 * Used for find operations.
 */
export declare type FindOptionsWhere<Entity> = {
    [P in keyof Entity]?: P extends "toString" ? unknown : FindOptionsWhereProperty<NonNullable<Entity[P]>>;
};
