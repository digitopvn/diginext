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

export const MongoDB = { toString, isObjectId, isValidObjectId, toObjectId };
