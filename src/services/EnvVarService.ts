import type { IEnvVar } from "@/entities/EnvVar";
import { envVarSchema } from "@/entities/EnvVar";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class EnvVarService extends BaseService<IEnvVar> {
	constructor(ownership?: Ownership) {
		super(envVarSchema, ownership);
	}

	async getByWorkspaceId(workspaceId: string) {
		return super.find({ workspaceId });
	}

	async getByProjectId(projectId: string) {
		return super.find({ projectId });
	}

	async getByAppId(appId: string) {
		return super.find({ appId });
	}

	async getByDeployEnvironment(appId: string, env: string) {
		const list = await super.find({ appId, env });
		return list;
	}

	// async getByEnvironmentId(environmentId: string) {
	// 	return super.find({ environmentId });
	// }

	async getByAppIdAndEnvironmentId(appId: string, environmentId: string) {
		return this.model.find({ appId, environmentId });
	}
}
