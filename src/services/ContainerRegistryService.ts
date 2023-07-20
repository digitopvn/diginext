import type { IContainerRegistry } from "@/entities/ContainerRegistry";
import { containerRegistrySchema } from "@/entities/ContainerRegistry";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class ContainerRegistryService extends BaseService<IContainerRegistry> {
	constructor(ownership?: Ownership) {
		super(containerRegistrySchema, ownership);
	}
}
