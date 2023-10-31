import dayjs from "dayjs";
import type { Types } from "mongoose";

import { IsTest } from "@/app.config";
import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type CreateWorkspaceParams = {
	name: string;
	type?: "default" | "hobby" | "self_hosted";
	packageId: string;
	userId: Types.ObjectId;
	email: string;
	public: boolean;
};

export type CreateWorkspaceResponse = ResponseData & {
	data: { name: string; slug: string; domain: string; subscriptionId: string; createdAt: string; updatedAt: string };
};
export type JoinWorkspaceResponse = ResponseData & {
	data: { name: string; createdAt: string; updatedAt: string };
};

export async function dxCreateWorkspace(params: CreateWorkspaceParams, dxKey: string) {
	return dxApi<CreateWorkspaceResponse>({ url: "/dx/workspaces", data: params, method: "POST", dxKey });
}

export async function dxJoinWorkspace(email: string, slug: string, dxKey: string) {
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
	return dxApi<JoinWorkspaceResponse>({ url: "/dx/join-workspace", data: { email, slug }, method: "POST", dxKey });
}
