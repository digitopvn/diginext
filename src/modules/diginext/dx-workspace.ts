import type { Types } from "mongoose";

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

export async function dxCreateWorkspace(params: CreateWorkspaceParams, dxKey: string) {
	console.log("Params >>>>", params);
	// if (IsTest())
	// 	return {
	// 		status: 1,
	// 		data: {
	// 			name: params.name,
	// 			slug: makeSlug(params.name),
	// 			subscriptionId: "xxx",
	// 			createdAt: dayjs().format(),
	// 			updatedAt: dayjs().format(),
	// 		},
	// 		messages: ["Ok"],
	// 	} as CreateWorkspaceResponse;

	const dataCreateWorkSpace: CreateWorkspaceParams = {
		name: params.name,
		email: params.email,
		userId: params.userId,
		packageId: params.packageId,
		public: params.public,
	};
	console.log("DX KEY >>>>", dxKey);

	return dxApi<CreateWorkspaceResponse>({ url: "/dx/workspaces", data: params, method: "POST", dxKey });
}
