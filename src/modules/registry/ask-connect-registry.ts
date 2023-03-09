import { logError } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { ContainerRegistry } from "@/entities";
import type { InputOptions } from "@/interfaces";

import { DB } from "../api/DB";
import { connectRegistry } from "./connect-registry";

export const askToConnectRegistry = async (options?: InputOptions) => {
	const registries = await DB.find<ContainerRegistry>("registry", {});

	if (isEmpty(registries)) {
		logError(`This workspace doesn't have any Container Registry providers.`);
		return;
	}

	const { registry } = await inquirer.prompt<{ registry: ContainerRegistry }>({
		name: "registry",
		type: "list",
		message: `Select container registry you want to connect:`,
		default: registries[0],
		choices: registries.map((reg) => {
			return { name: `${reg.name} (${reg.host} / ${reg.provider})`, value: reg };
		}),
	});

	const { provider } = registry;

	switch (provider) {
		case "gcloud":
			const resultGcloud = await connectRegistry(registry, options);

			return resultGcloud;
		case "digitalocean":
			const resultDo = await connectRegistry(registry, options);

			return resultDo;
		default:
			logError(`[CONTAINER REGISTRY] ❌ This container registry is not supported.`);
			break;
	}
};
