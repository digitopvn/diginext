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
	if (isObjectId(id)) {
		return id as ObjectId;
	}

	if (isValidObjectId(id)) {
		return new ObjectId(id);
	}

	// console.warn(`"${id}" is not a valid MongoDB's ObjectId`);
	return;
}
