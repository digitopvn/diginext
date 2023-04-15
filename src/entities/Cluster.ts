import mongoose, { Schema, Types } from "mongoose";

import { CloudProviderType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type { CloudProvider, ICloudProvider } from "./CloudProvider";
import type User from "./User";
import type Workspace from "./Workspace";

export interface ICluster extends IBase {
	name?: string;
	slug?: string;
	isVerified?: boolean;
	shortName?: string;
	contextName?: string;
	provider?: string | Types.ObjectId | ICloudProvider;
	providerShortName?: CloudProviderType;
	zone?: string;
	region?: string;
	projectID?: string;
	primaryDomain?: string;
	primaryIP?: string;
	domains?: string[];
	kubeConfig?: string;
	serviceAccount?: string;
	apiAccessToken?: string;
}

export const clusterSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String },
	slug: { type: String },
	isVerified: { type: Boolean },
	shortName: { type: String },
	contextName: { type: String },
	provider: { type: Types.ObjectId, ref: "cloud_providers" },
	providerShortName: { type: String },
	zone: { type: String },
	region: { type: String },
	projectID: { type: String },
	primaryDomain: { type: String },
	primaryIP: { type: String },
	domains: [{ type: String }],
	kubeConfig: { type: String },
	serviceAccount: { type: String },
	apiAccessToken: { type: String },
});

export const ClusterModel = mongoose.model("Cluster", clusterSchema, "clusters");

@Entity({ name: "clusters" })
export default class Cluster extends Base {
	/**
	 * Cluster name
	 */
	@Column()
	name?: string;

	/**
	 * Cluster slug
	 */
	@Column()
	slug?: string;

	/**
	 * Is cluster verified
	 */
	@Column({ default: false })
	isVerified?: boolean;

	/**
	 * A cluster name on the cloud provider
	 * - This is **NOT** a cluster name in `kubeconfig`
	 */
	@Column()
	shortName?: string;

	/**
	 * Cluster context name (to access via `kubectl context`)
	 */
	@Column()
	contextName?: string;

	/**
	 * Cloud provider of this cluster
	 */
	@ObjectIdColumn({ name: "cloud_providers" })
	provider?: string | ObjectID | CloudProvider;

	/**
	 * Short name of the cloud provider
	 * @example "gcloud", "digitalocean", "custom"
	 */
	@Column()
	providerShortName?: CloudProviderType;

	/**
	 * Cloud zone of this cluster
	 */
	@Column()
	zone?: string;

	/**
	 * Cloud region of this cluster
	 */
	@Column()
	region?: string;

	/**
	 * [GOOGLE ONLY] Project ID of this cluster
	 *
	 * @remarks This is not a project ID of BUILD SERVER database
	 */
	@Column()
	projectID?: string;

	/**
	 * #### `REQUIRES`
	 * ---
	 * The PRIMARY domain of this cluster
	 */
	@Column()
	primaryDomain?: string;

	/**
	 * The PRIMARY IP ADDRESS of this cluster
	 */
	@Column()
	primaryIP?: string;

	/**
	 * Alternative domains or project's domains of this cluster
	 */
	@Column()
	domains?: string[];

	/**
	 * The KUBECONFIG data to access to this cluster
	 */
	@Column()
	kubeConfig?: string;

	/**
	 * Content of the Service Account credentials to access this cluster
	 */
	@Column()
	serviceAccount?: string;

	/**
	 * Content of the API ACCESS TOKEN to access this cluster
	 */
	@Column()
	apiAccessToken?: string;

	/**
	 * User ID of the owner
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: Cluster) {
		super();
		Object.assign(this, data);
	}
}

export { Cluster };
