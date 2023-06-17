interface Address {
	address: string;
	type: string;
}

interface Allocatable {
	cpu: string;
	"ephemeral-storage": string;
	"github.com/fuse": string;
	"hugepages-1Gi": string;
	"hugepages-2Mi": string;
	memory: string;
	pods: string;
}

interface Capacity {
	cpu: string;
	"ephemeral-storage": string;
	"github.com/fuse": string;
	"hugepages-1Gi": string;
	"hugepages-2Mi": string;
	memory: string;
	pods: string;
}

interface Condition {
	lastHeartbeatTime: string;
	lastTransitionTime: string;
	message: string;
	reason: string;
	status: string;
	type: string;
}

interface DaemonEndpoints {
	kubeletEndpoint: {
		Port: number;
	};
}

interface Image {
	names: string[];
	sizeBytes: number;
}

interface NodeInfo {
	architecture: string;
	bootID: string;
	containerRuntimeVersion: string;
	kernelVersion: string;
	kubeProxyVersion: string;
	kubeletVersion: string;
	machineID: string;
	operatingSystem: string;
	osImage: string;
	systemUUID: string;
}

interface Metadata {
	annotations: Record<string, string>;
	creationTimestamp: string;
	finalizers: string[];
	labels: Record<string, string>;
	name: string;
	resourceVersion: string;
	uid: string;
}

interface Status {
	addresses: Partial<Address>[];
	allocatable: Partial<Allocatable>;
	capacity: Partial<Capacity>;
	conditions: Partial<Condition>[];
	daemonEndpoints: Partial<DaemonEndpoints>;
	images: Image[];
	nodeInfo: Partial<NodeInfo>;
}

interface Spec {
	podCIDR: string;
	podCIDRs: string[];
	providerID: string;
}

export interface KubeNode {
	apiVersion: string;
	kind: string;
	metadata: Partial<Metadata>;
	spec: Partial<Spec>;
	status: Partial<Status>;
	// extras
	clusterShortName?: string;
	/**
	 * Cluster ID
	 */
	cluster?: string;
	/**
	 * Workspace ID
	 */
	workspace?: string;
	/**
	 * Usage
	 */
	cpu?: string;
	cpuPercent?: string;
	cpuCapacity?: string;
	memory?: string;
	memoryPercent?: string;
	memoryCapacity?: string;
}
