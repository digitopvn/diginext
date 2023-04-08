import { logError, logWarn } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";

import type { ContainerRegistry, ContainerRegistryDto } from "@/entities";
import type { RegistryProviderType } from "@/interfaces/SystemTypes";
import { registryProviderList } from "@/interfaces/SystemTypes";

import { DB } from "../api/DB";
import { connectRegistry } from "./connect-registry";

export const addContainerRegistry = async (
	data: ContainerRegistryDto,
	options: {
		/**
		 * Owner's user ID
		 */
		owner: string;
		/**
		 * Workspace ID
		 */
		workspace: string;
	}
) => {
	if (!data.provider) {
		const { provider } = await inquirer.prompt<{ provider: RegistryProviderType }>({
			name: "provider",
			type: "list",
			message: "Select provider:",
			default: registryProviderList[0],
			choices: registryProviderList.map((name, i) => {
				return { name: `[${i + 1}] ${name}`, value: name };
			}),
		});
		data.provider = provider;
	}

	if (!data.name) {
		const { value } = await inquirer.prompt<{ value: string }>({
			name: "value",
			type: "input",
			message: "Name:",
		});
		data.name = value;
	}

	switch (data.provider) {
		case "gcloud":
			// default
			if (!data.host) data.host = "gcr.io";

			// ask serviceAccount
			if (!data.serviceAccount) {
				const { value } = await inquirer.prompt<{ value: string }>({
					name: "value",
					type: "editor",
					message: "Google Service Account:",
				});
				data.serviceAccount = value;
			}
			break;

		case "digitalocean":
			if (!data.host) data.host = "registry.digitalocean.com";
			// ask api access token
			if (!data.apiAccessToken) {
				const { value } = await inquirer.prompt<{ value: string }>({
					name: "value",
					type: "password",
					message: "Digital Ocean API_ACCESS_TOKEN:",
				});
				data.apiAccessToken = value;
			}
			break;

		case "dockerhub":
			data.dockerServer = "https://index.docker.io/v2/";
			if (!data.host) data.host = "docker.io";

			// ask login credentials
			if (!data.dockerUsername) {
				const { value } = await inquirer.prompt<{ value: string }>({
					name: "value",
					type: "input",
					message: "Docker username:",
				});
				data.dockerUsername = value;
			}
			if (!data.dockerPassword) {
				const { value } = await inquirer.prompt<{ value: string }>({
					name: "value",
					type: "password",
					message: "Docker password:",
				});
				data.dockerPassword = value;
			}
			break;

		default:
			return logError(`Container registry provider "${data.provider}" is not valid.`);
	}

	const registry = await DB.create<ContainerRegistry>("registry", data);

	if (registry) {
		await connectRegistry(registry, { userId: options.owner, workspaceId: options.workspace });
	} else {
		logWarn(`Added container registry "${registry.name}" but failed to connect.`);
	}

	return registry;
};
