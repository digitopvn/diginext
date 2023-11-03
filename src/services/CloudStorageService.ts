import type { ICloudStorage } from "@/entities/CloudStorage";
import { cloudStorageSchema } from "@/entities/CloudStorage";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class CloudStorageService extends BaseService<ICloudStorage> {
	constructor(ownership?: Ownership) {
		super(cloudStorageSchema, ownership);
	}
}
