import type { IUser } from "@/entities";

import { MongoDB } from "./mongodb";

export const isOwned = (data: any, user: IUser) => {
	if (!data) throw new Error(`Argument "data" is required`);
	if (!user) throw new Error(`Argument "user" is required`);
	return MongoDB.isValidObjectId(data.owner) ? data.owner === user._id : data.owner?._id === user._id;
};
