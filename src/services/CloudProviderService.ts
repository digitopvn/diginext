import type { ICloudProvider } from "@/entities/CloudProvider";
import { cloudProviderSchema } from "@/entities/CloudProvider";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class CloudProviderService extends BaseService<ICloudProvider> {
	constructor(ownership?: Ownership) {
		super(cloudProviderSchema, ownership);
	}
}
