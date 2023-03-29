import { ObjectId } from "mongodb";

import type { InputOptions } from "@/interfaces";
import { isValidObjectId } from "@/plugins/mongodb";

export const testCommand = async (options?: InputOptions) => {
	// 63b117e2387f529fc07d7673
	const testIds = ["63eb404227aea2b9b212ee4d", new ObjectId("63b117e2387f529fc07d7673"), "123", "testtesttesttest", "11111111111111111111111"];

	testIds.map((id) => console.log(`${id} :>> ${isValidObjectId(id)}`));
};
