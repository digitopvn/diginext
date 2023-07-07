import { clusterSchema } from "@/entities/Cluster";

import BaseService from "./BaseService";

export default class ClusterService extends BaseService {
	constructor() {
		super(clusterSchema);
	}
}

export { ClusterService };
