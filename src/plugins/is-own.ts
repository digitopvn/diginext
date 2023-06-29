import type { IUser } from "@/entities";

import { MongoDB } from "./mongodb";

export const isOwned = (data: any, user: IUser) => {
	if (!data) return false;
	if (!user) return false;
	return MongoDB.isValidObjectId(data.owner) ? data.owner === user._id : data.owner?._id === user._id;
};
