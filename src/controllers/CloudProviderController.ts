import CloudProviderService from "@/services/CloudProviderService";

import BaseController from "./BaseController";

export default class CloudProviderController extends BaseController<CloudProviderService> {
	constructor() {
		super(new CloudProviderService());
	}
}
