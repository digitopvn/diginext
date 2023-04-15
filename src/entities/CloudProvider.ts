import mongoose, { Schema } from "mongoose";

import { cloudProviderList, CloudProviderType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type Cluster from "./Cluster";
import type { ICluster } from "./Cluster";
import type User from "./User";
import type Workspace from "./Workspace";

export interface ICloudProvider extends IBase {
	name?: string;
	shortName?: CloudProviderType;
	apiAccessToken?: string;
	serviceAccount?: string;
	clusters?: string[] | ICluster[];
}

export const cloudProviderSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String },
	shortName: { type: String, enum: cloudProviderList },
	apiAccessToken: { type: String },
	serviceAccount: { type: String },
	clusters: [{ type: Schema.Types.ObjectId, ref: "clusters" }],
});

export const CloudProviderModel = mongoose.model("CloudProvider", cloudProviderSchema, "cloud_providers");

@Entity({ name: "cloud_providers" })
export default class CloudProvider extends Base {
	/**
	 * Cloud provider name
	 */
	@Column()
	name?: string;

	/**
	 * Cloud provider short name, without spacing & special characters
	 */
	@Column()
	shortName?: CloudProviderType;

	// @Column({ default: [] })
	// ips?: string[];

	// @Column({ default: [] })
	// domains?: string[];

	/**
	 * Content of the API access token to use services on this cloud provider
	 * - Apply for: Digital Ocean
	 */
	// @Column()
	apiAccessToken?: string;

	/**
	 * Content of the Service Account credentials ti access services on this cloud provider
	 * - Apply for: Google Cloud, AWS,...
	 * - For example: Kubernetes Clusters, Single Sign-On,...
	 */
	// @Column()
	serviceAccount?: string;

	/**
	 * List of available clusters on this provider
	 */
	// @ObjectIdColumn({ name: "clusters", array: true, default: [] })
	clusters?: string[] | Cluster[];

	/**
	 * User ID of the owner
	 *
	 * @remarks This can be populated to {User} data
	 */
	// @ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	// @ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: CloudProvider) {
		super();
		Object.assign(this, data);
	}
}

export { CloudProvider };
