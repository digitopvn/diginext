import dayjs from "dayjs";

import { IsTest } from "@/app.config";
import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type CreateWorkspaceParams = {
	userId: string;
	name: string;
	public: boolean;
	subscriptionId?: string;
};

export type CreateWorkspaceResponse = ResponseData & {
	data: { name: string; slug: string; domain: string; subscriptionId: string; createdAt: string; updatedAt: string };
};
export type JoinWorkspaceResponse = ResponseData & {
	data: { name: string; createdAt: string; updatedAt: string };
};

export async function dxCreateWorkspace(params: CreateWorkspaceParams, options?: { isDebugging?: boolean }) {
	return dxApi<CreateWorkspaceResponse>({ url: "/workspaces", data: params, method: "POST", isDebugging: options?.isDebugging });
}

export async function dxJoinWorkspace(email: string, slug: string, dxKey: string, options?: { isDebugging?: boolean }) {
	console.log("JOIN WORKSPACE", dxKey);
	if (IsTest())
		return {
			status: 1,
			data: {
				name: email,
				slug: slug,
				subscriptionId: "xxx",
				createdAt: dayjs().format(),
				updatedAt: dayjs().format(),
			},
			messages: ["Ok"],
		} as CreateWorkspaceResponse;
	return dxApi<JoinWorkspaceResponse>({ url: "/join-workspace", data: { email, slug }, method: "POST", dxKey, isDebugging: options?.isDebugging });
}

// export async function dxIsOnwerWorkspace(userId: string, workspaceId: string) {
// 	console.log("CHECK IS OWNER WORKSPACE");
// 	if (IsTest()) {
// 		return
// 	}
// }
