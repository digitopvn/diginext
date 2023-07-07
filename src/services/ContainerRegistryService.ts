import { containerRegistrySchema } from "@/entities/ContainerRegistry";

import BaseService from "./BaseService";

export default class ContainerRegistryService extends BaseService {
	constructor() {
		super(containerRegistrySchema);
	}
}

export { ContainerRegistryService };
