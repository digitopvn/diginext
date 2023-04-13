import { ObjectID } from "@/libs/typeorm";

export function isObjectID(id) {
	return id instanceof ObjectID;
}

export function isValidObjectID(id) {
	if (ObjectID.isValid(id)) {
		if (String(new ObjectID(id)) === id) return true;
		return false;
	}
	return false;
}

export function toObjectID(id: any) {
	if (isObjectID(id)) return id as ObjectID;
	if (isValidObjectID(id)) return new ObjectID(id);
	return;
}

function toString(id) {
	const _id = toObjectID(id);
	if (!_id) return;
	return _id.toHexString();
}

export const MongoDB = { toString, isObjectID, isValidObjectID, toObjectID };
