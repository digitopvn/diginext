import { ObjectId } from "mongodb";

export function isValidObjectId(id) {
	try {
		return new ObjectId(id).toString() === id;
	} catch (e: any) {
		return false;
	}
}
