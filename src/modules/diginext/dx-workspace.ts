import dayjs from "dayjs";

import { IsTest } from "@/app.config";
import type { ResponseData } from "@/interfaces";
import { makeSlug } from "@/plugins/slug";

import { dxApi } from "./dx-api";

export type CreateWorkspaceParams = {
	name: string;
	type?: "default" | "hobby" | "self_hosted";
};

export type CreateWorkspaceResponse = ResponseData & {
	data: { name: string; slug: string; domain: string; subscriptionId: string; createdAt: string; updatedAt: string };
};

export async function dxCreateWorkspace(params: CreateWorkspaceParams, dxKey: string) {
	if (IsTest())
		return {
			status: 1,
			data: {
				name: params.name,
				slug: makeSlug(params.name),
				subscriptionId: "xxx",
				createdAt: dayjs().format(),
				updatedAt: dayjs().format(),
			},
			messages: ["Ok"],
		} as CreateWorkspaceResponse;

	return dxApi<CreateWorkspaceResponse>({ url: "/workspaces", data: params, method: "POST", dxKey });
}
