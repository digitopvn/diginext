import { isJSON } from "class-validator";
import { ObjectId } from "mongodb";

import { isValidObjectId } from "./mongodb";

export const parseMongoData = (data: any) => {
	// filter
	const _data = { ...data };

	// convert search to boolean
	Object.entries(_data).forEach(([key, val]) => {
		if (key == "id" || key == "_id") {
			_data._id = isValidObjectId(val) ? new ObjectId(val.toString()) : val;
			delete _data.id;
		}

		if (val == null || val == undefined) {
			_data[key] = null;
		} else if (isValidObjectId(val)) {
			_data[key] = new ObjectId(val.toString());
		} else if (isJSON(val)) {
			_data[key] = JSON.parse(val.toString());
		} else {
			_data[key] = val;
		}
	});

	return _data;
};
