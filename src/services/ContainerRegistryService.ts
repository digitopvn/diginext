import type { IContainerRegistry } from "@/entities/ContainerRegistry";
import { containerRegistrySchema } from "@/entities/ContainerRegistry";

import BaseService from "./BaseService";

export default class ContainerRegistryService extends BaseService<IContainerRegistry> {
	constructor() {
		super(containerRegistrySchema);
	}
}

export { ContainerRegistryService };
