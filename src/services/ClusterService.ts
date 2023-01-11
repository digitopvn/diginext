import Cluster from "@/entities/Cluster";

import BaseService from "./BaseService";

export default class ClusterService extends BaseService<Cluster> {
	constructor() {
		super(Cluster);
	}
}

export { ClusterService };
