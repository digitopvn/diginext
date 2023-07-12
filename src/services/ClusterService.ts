import type { ICluster } from "@/entities/Cluster";
import { clusterSchema } from "@/entities/Cluster";

import BaseService from "./BaseService";

export class ClusterService extends BaseService<ICluster> {
	constructor() {
		super(clusterSchema);
	}
}
