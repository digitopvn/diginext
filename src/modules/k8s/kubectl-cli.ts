import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import type InputOptions from "@/interfaces/InputOptions";

import { askForCluster } from "../cluster/ask-for-cluster";
import ClusterManager from ".";
import { askForDeployment } from "./ask-for-deployment";
import { askForNamespace } from "./ask-for-namespace";
import { askForNewValue } from "./ask-for-new-value";
import { askForTargetProp } from "./ask-for-target-prop";

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
					const targetNamespace = namespace ?? (await askForNamespace(cluster));

					const targetDeployment = await askForDeployment(cluster, targetNamespace);
					if (!targetDeployment) return;

					const targetProp = await askForTargetProp("deployment");

					switch (targetProp) {
						case "image":
							let { imageURL } = options;
							if (!imageURL) imageURL = await askForNewValue();

							const imgRes = await ClusterManager.setDeployImageAll(targetDeployment, imageURL, targetNamespace, { context });
							if (imgRes)
								logSuccess(
									`[DX_KB] Successfully set new image (${imageURL}) to "${targetDeployment}" deployment of "${targetNamespace}" namespace on "${shortName}" cluster.`
								);
							break;

						case "imagePullSecrets":
							let { key: imagePullSecret } = options;
							if (!imagePullSecret) imagePullSecret = await askForNewValue();

							const imgPullRes = await ClusterManager.setDeployImagePullSecretByFilter(imagePullSecret, targetNamespace, { context });
							if (imgPullRes)
								logSuccess(
									`[DX_KB] Successfully set new imagePullSecret (${imagePullSecret}) to "${targetDeployment}" deployment of "${targetNamespace}" namespace on "${shortName}" cluster.`
								);
							break;

						case "port":
							let { port } = options;
							if (typeof port === "undefined") port = await askForNewValue<number>();

							const portRes = await ClusterManager.setDeployPortAll(targetDeployment, port.toString(), targetNamespace, { context });
							if (portRes)
								logSuccess(
									`[DX_KB] Successfully set new port (${port}) to "${targetDeployment}" deployment of "${targetNamespace}" namespace on "${shortName}" cluster.`
								);
							break;
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
