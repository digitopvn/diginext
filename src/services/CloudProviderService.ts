import CloudProvider from "@/entities/CloudProvider";

import BaseService from "./BaseService";

export default class CloudProviderService extends BaseService<CloudProvider> {
	constructor() {
		super(CloudProvider);
	}
}

export { CloudProviderService };
