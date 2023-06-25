import authCluster from "./cluster-auth";
import { createImagePullSecretsInNamespace } from "./image-pull-secret";
import { currentCluster, currentContext, getKubeConfig, getKubeContextByCluster, getKubeContextByClusterShortName } from "./kube-config";
import { previewPrerelease, rollout } from "./kube-deploy";
import {
	createNamespace,
	deleteDeploy,
	deleteDeploymentsByFilter,
	deleteEnvVar,
	deleteEnvVarByFilter,
	deleteIngress,
	deleteIngressByFilter,
	deleteNamespace,
	deleteNamespaceByCluster,
	deleteSecret,
	deleteSecretsByFilter,
	deleteService,
	deleteServiceByFilter,
	getAllDeploys,
	getAllIngresses,
	getAllNamespaces,
	getAllNodes,
	getAllPods,
	getAllSecrets,
	getAllServices,
	getDeploy,
	getDeploys,
	getDeploysByFilter,
	getIngress,
	getIngressClasses,
	getIngresses,
	getPod,
	getPods,
	getPodsByFilter,
	getSecrets,
	getService,
	getServices,
	isNamespaceExisted,
	isSecretExisted,
	kubectlApply,
	kubectlApplyContent,
	logPod,
	logPodByFilter,
	rollbackDeploy,
	rollbackDeployRevision,
	setDeployImage,
	setDeployImageAll,
	setDeployImagePullSecretByFilter,
	setDeployPortAll,
	setEnvVar,
	setEnvVarByFilter,
} from "./kubectl";
import { checkCertManagerInstalled, checkNginxIngressInstalled } from "./stack-check";
import { installCertManagerStack, installNginxIngressStack } from "./stack-install";

const ClusterManager = {
	// cluster-helpers
	authCluster,
	createImagePullSecretsInNamespace,
	currentContext,
	currentCluster,
	// kube-helpers
	createNamespace,
	deleteNamespace,
	deleteNamespaceByCluster,
	deleteSecret,
	deleteDeploy,
	deleteDeploymentsByFilter,
	deleteEnvVar,
	deleteEnvVarByFilter,
	deleteIngressByFilter,
	deleteIngress,
	deleteSecretsByFilter,
	deleteService,
	deleteServiceByFilter,
	getKubeConfig,
	getKubeContextByClusterShortName,
	getKubeContextByCluster,
	getDeploys,
	getDeploysByFilter,
	getAllNodes,
	getPod,
	getPodsByFilter,
	getPods,
	getSecrets,
	getServices,
	getService,
	getIngresses,
	getIngress,
	getIngressClasses,
	getDeploy,
	getAllIngresses,
	getAllDeploys,
	getAllPods,
	getAllNamespaces,
	getAllSecrets,
	getAllServices,
	logPod,
	logPodByFilter,
	isNamespaceExisted,
	isSecretExisted,
	setEnvVar,
	setEnvVarByFilter,
	setDeployImage,
	setDeployImageAll,
	setDeployImagePullSecretByFilter,
	setDeployPortAll,
	// deploy
	previewPrerelease,
	rollout,
	kubectlApply,
	kubectlApplyContent,
	rollbackDeploy,
	rollbackDeployRevision,
	// stacks
	checkCertManagerInstalled,
	checkNginxIngressInstalled,
	installCertManagerStack,
	installNginxIngressStack,
};

export default ClusterManager;