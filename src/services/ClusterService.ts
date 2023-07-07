import type { ICluster } from "@/entities/Cluster";
import { clusterSchema } from "@/entities/Cluster";

import BaseService from "./BaseService";

export default class ClusterService extends BaseService<ICluster> {
	constructor() {
		super(clusterSchema);
	}
}

export { ClusterService };
