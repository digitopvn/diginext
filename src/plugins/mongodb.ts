import { ObjectId } from "mongodb";

export function isValidObjectId(id) {
	if (id instanceof ObjectId) return true;

	try {
		return new ObjectId(id.toString()).toString() === id;
	} catch (e: any) {
		return false;
	}
}
