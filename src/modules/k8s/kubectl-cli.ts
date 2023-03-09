import { logError, logSuccess } from "diginext-utils/dist/console/log";
import yargs from "yargs";

import type InputOptions from "@/interfaces/InputOptions";

import { askForCluster } from "../cluster/ask-for-cluster";
import ClusterManager from ".";
import { askForDeployment } from "./ask-for-deployment";
import { askForNamespace } from "./ask-for-namespace";

const kubectlCommand = (resource: string) => {};

export const execKubectl = async (options?: InputOptions) => {
	const { secondAction: action, thirdAction: resource, namespace } = options;

	const cluster = await askForCluster();
	if (!cluster) return;
	const { contextName: context, shortName } = cluster;

	switch (action) {
		case "get":
			break;

		case "set":
			switch (resource) {
				case "deploy":
				case "deployment":
					const { imageURL, port, size } = options;
					const targetNamespace = namespace ?? (await askForNamespace(cluster));
					const targetDeployment = await askForDeployment(cluster, targetNamespace);
					// const updateImageURL = imageURL ?? (await askForImageURL());
					if (imageURL) {
						const imgRes = await ClusterManager.setDeployImage(targetDeployment, imageURL, targetNamespace, { context });
						if (imgRes)
							logSuccess(
								`[DX_KB] Successfully set new image (${imageURL}) to "${targetDeployment}" deployment of "${targetNamespace}" namespace on "${shortName}" cluster.`
							);
					}
					break;

				default:
					yargs.showHelp();
					break;
			}
			break;

		case "del":
		case "delete":
			break;

		default:
			logError(`Action "${action}" in "${resource}" resource is invalid.`);
			break;
	}
};
