import { ObjectId } from "mongodb";

export function isObjectId(id) {
	return id instanceof ObjectId;
}

export function isValidObjectId(id) {
	if (ObjectId.isValid(id)) {
		if (String(new ObjectId(id)) === id) return true;
		return false;
	}
	return false;
}

export function toObjectId(id: any) {
	if (isObjectId(id)) return id as ObjectId;
	if (isValidObjectId(id)) return new ObjectId(id);
	return;
}

function toString(id) {
	const _id = toObjectId(id);
	if (!_id) return;
	return _id.toHexString();
}

export interface MongooseFindOptions {
	/**
	 * Simple condition that should be applied to match entities.
	 */
	where?: { [key: string]: any };
	/**
	 * Offset (paginated) where from entities should be taken.
	 */
	skip?: number;
	/**
	 * Limit (paginated) - max number of entities should be taken.
	 */
	take?: number;
}

export const MongoDB = { toString, isObjectId, isValidObjectId, toObjectId };
