import type { Types } from "mongoose";

import { IsTest } from "@/app.config";
import type { ProviderInfo } from "@/entities/User";
import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type IBodyCreateUser = {
	email: string;
	image?: string;
	name: string;
	username?: string;
	password?: string;
	metadata?: any;
	providers?: ProviderInfo;
	workspaces?: Types.Array<any>;
	roles?: Types.Array<any>;
	isActive: boolean;
};

export type CreateUserResponse = ResponseData & {
	data: { name: string; createdAt: string; updatedAt: string };
};

export async function dxCreateUser(params: IBodyCreateUser, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: {} } as CreateUserResponse;

	return dxApi<CreateUserResponse>({ url: "/dx/user", data: params, method: "POST", isDebugging: options?.isDebugging });
}
