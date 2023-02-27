import { log, logError } from "diginext-utils/dist/console/log";
import execa from "execa";
import { isEmpty } from "lodash";
import path from "path";

import { isServerMode } from "@/app.config";
import { cliOpts } from "@/config/config";
import type { Cluster } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { execCmd, getAppConfig, Logger } from "@/plugins";
import { ClusterService } from "@/services";

import { fetchApi } from "../api";
import { ClusterManager } from "../k8s";
import { sendMessage } from "./send-log-message";
import { queue } from "./start-build";
import { updateBuildStatus } from "./update-build-status";

/**
 * Use "kubectl apply" command to roll out the deployment
 * @deprecated
 */
async function kubectlApply(options: InputOptions) {
	const { env = "dev", SOCKET_ROOM, namespace, projectSlug, slug: appSlug } = options;
	const logger = new Logger(SOCKET_ROOM);

	let stream,
		message = "";

	let cluster = options.cluster;

	const appDirectory = options.targetDirectory;
	const appConfig = getAppConfig(appDirectory);
	const NAMESPACE_FILE = path.resolve(appDirectory, `deployment/namespace.${env}.yaml`);
	const DEPLOYMENT_FILE = path.resolve(appDirectory, `deployment/deployment.${env}.yaml`);
	const PRERELEASE_DEPLOYMENT_FILE = path.resolve(appDirectory, "deployment/deployment.prerelease.yaml");

	let targetCluster;
	if (isServerMode) {
		const clusterSvc = new ClusterService();
		targetCluster = await clusterSvc.findOne({ shortName: cluster }, { populate: ["workspace", "provider"] });
	} else {
		const { data: clusters, messages } = await fetchApi<Cluster>({ url: `/api/v1/cluster?populate=workspace,provider&shortName=${cluster}` });
		if (isEmpty(clusters)) {
			logError(`[kubeApply] Can't get cluster:`, messages);
			return;
		}
		targetCluster = clusters[0];
	}
	// const provider = targetCluster.provider as CloudProvider;

	// Auth & select correct cloud provider / cluster
	const clusterShortName = targetCluster.shortName;
	try {
		await ClusterManager.auth(clusterShortName);
	} catch (e) {
		logError(e);
		return false;
	}

	// try to get namespaces
	try {
		await execa.command(`kubectl create ns ${namespace}`);

		message = `Namespace "${namespace}" vừa được tạo thành công.`;
		sendMessage({ SOCKET_ROOM, logger, message });
	} catch (e) {
		message = `Cannot create namespace "${namespace}": ${e}`;
		sendMessage({ SOCKET_ROOM, logger, message });
	}

	try {
		// ! luôn tạo "imagePullSecret" để server có thể pull docker image về
		let imagePullSecret = await ClusterManager.createImagePullSecretsInNamespace(appSlug, env, namespace);

		if (imagePullSecret && imagePullSecret.name) {
			message = `Created "imagePullSecret" named "${imagePullSecret.name}" successfully.`;
			sendMessage({ SOCKET_ROOM, logger, message });
		}
	} catch (e) {
		message = `[WARN] Creating "imagePullSecret" failed -> ${e.toString()}`;
		sendMessage({ SOCKET_ROOM, logger, message });
	}

	// apply (create) the namespace yaml
	await execCmd(`kubectl apply -f ${NAMESPACE_FILE}`);

	// if env is "prod", delete previous "prerelease" svc & deploy:
	const prevPrereleaseServices = await ClusterManager.getAllServices(namespace, "phase=prerelease,main-app=" + appConfig.slug.toLowerCase());
	if (!isEmpty(prevPrereleaseServices)) {
		const services = prevPrereleaseServices.map((svc) => svc.metadata.name).join(" ");
		log(`Deleting PRE-RELEASE services: ${services}`);
		await execCmd(`kubectl -n ${namespace} delete svc ${services}`);
	}

	// kubectl apply -f $DEPLOYMENT_FILE
	try {
		message = `Deploying to "${cluster}" (environment: ${env.toUpperCase()})...`;
		sendMessage({ SOCKET_ROOM, logger, message });

		// apply the deployment yaml
		if (env != "prod") {
			stream = execa("kubectl", ["apply", "-f", DEPLOYMENT_FILE], cliOpts);
		} else {
			stream = execa("kubectl", ["apply", "-f", PRERELEASE_DEPLOYMENT_FILE], cliOpts);
		}

		stream.stdio.forEach((_stdio) => {
			if (_stdio) {
				_stdio.on("data", (data) => {
					// send messages to CLI client:
					message = data.toString();
					sendMessage({ SOCKET_ROOM, logger, message });
				});
			}
		});
		await stream;

		message = `Deploying to ${env.toUpperCase()} environment on [${cluster}] completed!`;
		sendMessage({ SOCKET_ROOM, logger, message });
	} catch (e) {
		sendMessage({ SOCKET_ROOM, logger, message: e.toString() });
		await updateBuildStatus(appSlug, SOCKET_ROOM, "failed");
		logError(e);
	}

	return true;
}
export async function queueKubeApply(options: InputOptions) {
	try {
		return await queue.add(() => kubectlApply(options));
	} catch (e) {
		log(`Queue job failed -> kubectlApply() -> `, options);
		log(e);
	}

	/**
	 * WITH "KUE"
	 */
	// return new Promise((resolve, reject) => {
	// 	let job = queue.create("kubectlApply", options).removeOnComplete(true).save();
	// 	log("job:", job);
	// 	job.on("complete", (data) => {
	// 		log(`Done`, data);
	// 		resolve(data);
	// 	});
	// 	job.on("failed", (data) => {
	// 		log(`Failed`, data);
	// 		reject(data);
	// 	});
	// });
}
