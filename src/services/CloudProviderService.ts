import { cloudProviderSchema } from "@/entities/CloudProvider";

import BaseService from "./BaseService";

export default class CloudProviderService extends BaseService {
	constructor() {
		super(cloudProviderSchema);
	}
}

export { CloudProviderService };
