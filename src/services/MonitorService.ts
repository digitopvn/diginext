import type { IUser, IWorkspace } from "@/entities";
import type { Ownership } from "@/interfaces/SystemTypes";

export * from "./MonitorDeploymentService";
export * from "./MonitorIngressService";
export * from "./MonitorNamespaceService";
export * from "./MonitorPodService";
export * from "./MonitorSecretService";
export * from "./MonitorServiceService";
export * from "./MonitorStatefulSetService";

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

	constructor(ownership?: Ownership) {
		this.ownership = ownership;
		this.user = ownership?.owner;
		this.workspace = ownership?.workspace;
	}
}
