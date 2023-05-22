import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type CreateWorkspaceParams = {
	name: string;
};

export type CreateWorkspaceResponse = ResponseData & {
	data: { name: string; slug: string; domain: string; subscriptionId: string; createdAt: string; updatedAt: string };
};

export async function createDxWorkspace(params: CreateWorkspaceParams, dxKey: string) {
	return dxApi<CreateWorkspaceResponse>({ url: "/workspaces", data: params, method: "POST", dxKey });
}
