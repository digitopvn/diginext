import type { EntitySchema } from "..";
import type { ObjectType } from "./ObjectType";
/**
 * Entity target.
 */
export declare type EntityTarget<Entity> = ObjectType<Entity> | EntitySchema<Entity> | string | {
    type: Entity;
    name: string;
};
