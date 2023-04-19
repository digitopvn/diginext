import mongoose, { Types } from "mongoose";

export function isObjectId(id) {
	return id instanceof Types.ObjectId;
}

export function isValidObjectId(id) {
	// return mongoose.isValidObjectId(id);
	// if (mongoose.isValidObjectId(id)) return true;
	if (mongoose.mongo.ObjectId.isValid(id)) {
		if (String(new mongoose.mongo.ObjectId(id)) === id) return true;
		return false;
	}
	return false;
}

export function toObjectId(id: any) {
	// console.log(`isObjectId(${id})`, isObjectId(id));
	// console.log(`isValidObjectId(${id})`, isValidObjectId(id));
	if (isObjectId(id)) return id;
	if (isValidObjectId(id)) return new mongoose.mongo.ObjectId(id);
	return;
}

function toString(id) {
	const _id = toObjectId(id);
	if (!_id) return;
	let idStr = _id.toHexString() as string;
	if (!idStr) idStr = _id.toString();
	return idStr;
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
