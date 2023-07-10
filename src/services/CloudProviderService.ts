import type { ICloudProvider } from "@/entities/CloudProvider";
import { cloudProviderSchema } from "@/entities/CloudProvider";

import BaseService from "./BaseService";

export default class CloudProviderService extends BaseService<ICloudProvider> {
	constructor() {
		super(cloudProviderSchema);
	}
}

export { CloudProviderService };
