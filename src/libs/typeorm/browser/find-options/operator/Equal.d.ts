import type { EqualOperator } from "../EqualOperator";
import type { FindOperator } from "../FindOperator";
/**
 * Find Options Operator.
 * This operator is handy to provide object value for non-relational properties of the Entity.
 *
 * Examples:
 *      { someField: Equal("value") }
 *      { uuid: Equal(new UUID()) }
 */
export declare function Equal<T>(value: T | FindOperator<T>): EqualOperator<T>;
