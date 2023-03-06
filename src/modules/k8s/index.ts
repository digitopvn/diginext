import authCluster from "./cluster-auth";
import { createImagePullSecretsInNamespace } from "./image-pull-secret";
import { currentCluster, currentContext, getKubeConfig, getKubeContextByCluster, getKubeContextByClusterShortName } from "./kube-config";
import { previewPrerelease, rollout } from "./kube-deploy";
import {
	deleteDeploy,
	deleteNamespace,
	deleteNamespaceByCluster,
	deleteSecret,
	getAllDeploys,
	getAllNamespaces,
	getAllPods,
	getAllSecrets,
	getAllServices,
	getDeploy,
	getIngress,
	getPod,
	getService,
	isNamespaceExisted,
	isSecretExisted,
} from "./kubectl";

const ClusterManager = {
	authCluster,
	createImagePullSecretsInNamespace,
	currentContext,
	currentCluster,
	deleteNamespace,
	deleteNamespaceByCluster,
	deleteSecret,
	deleteDeploy,
	getKubeConfig,
	getKubeContextByClusterShortName,
	getKubeContextByCluster,
	getAllDeploys,
	getService,
	getAllServices,
	getPod,
	getAllPods,
	getIngress,
	getAllSecrets,
	getAllNamespaces,
	getDeploy,
	isNamespaceExisted,
	isSecretExisted,
	previewPrerelease,
	rollout,
};

export default ClusterManager;
