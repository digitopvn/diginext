import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";
import type { DxSubsription } from "./dx-subscription";

export type DxPackage = {
	id?: string;
	slug?: string;
	name?: string;
	description?: string;
	type?: string;
	price?: number;
	currency?: string;
	quota?: any;
	visible?: boolean;
	disable?: boolean;
	userId?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type SubscribeParams = {
	userEmail: string;
	userName?: string;
	name?: string;
	packageId: string;
};

export type SubscribeResponse = ResponseData & {
	data: DxSubsription;
};

export type PackageResponse = ResponseData & {
	data: DxPackage[];
};

export async function dxGetPackages() {
	return dxApi<SubscribeResponse>({ url: "/packages" });
}

export async function dxSubscribe(params: SubscribeParams) {
	return dxApi<SubscribeResponse>({ url: "/packages/subscribe", data: params, method: "POST" });
}
