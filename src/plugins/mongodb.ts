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
