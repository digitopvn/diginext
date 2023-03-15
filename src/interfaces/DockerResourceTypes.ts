export type DockerImageType = {
	Containers?: string;
	CreatedAt?: string;
	CreatedSince?: string;
	Digest?: string;
	ID?: string;
	Repository?: string;
	SharedSize?: string;
	Size?: string;
	Tag?: string;
	UniqueSize?: string;
	VirtualSize?: string;
};

export type DockerVolumeType = {
	Driver: string;
	Labels: string;
	Links: string;
	Mountpoint: string;
	Name: string;
	Scope: string;
	Size: string;
};

export type DockerContainerType = {
	Command: string;
	CreatedAt: string;
	ID: string;
	Image: string;
	Labels: string;
	LocalVolumes: string;
	Mounts: string;
	Names: string;
	Networks: string;
	Ports: string;
	RunningFor: string;
	Size: string;
	State: string;
	Status: string;
};

export type DockerSystemDiskUsage = {
	Active: string;
	Reclaimable: string;
	Size: string;
	TotalCount: string;
	Type: string;
};
