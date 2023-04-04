import { CloudProviderType } from "@/interfaces/SystemTypes";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type { CloudProvider } from "./CloudProvider";
import type User from "./User";
import type Workspace from "./Workspace";

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
