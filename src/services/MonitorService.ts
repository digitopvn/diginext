import type { IUser, IWorkspace } from "@/entities";
import type { Ownership } from "@/interfaces/SystemTypes";

export class MonitorService {
	/**
	 * Current login user
	 */
	user?: IUser;

	/**
	 * Current active workspace
	 */
	workspace?: IWorkspace;

	/**
	 * Current owner & workspace
	 */
	ownership?: Ownership;
}
