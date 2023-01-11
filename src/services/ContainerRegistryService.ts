import ContainerRegistry from "@/entities/ContainerRegistry";

import BaseService from "./BaseService";

export default class ContainerRegistryService extends BaseService<ContainerRegistry> {
	constructor() {
		super(ContainerRegistry);
	}
}

export { ContainerRegistryService };
