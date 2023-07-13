import { logError, logWarn } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";

import type { ContainerRegistryDto } from "@/entities";
import type { RegistryProviderType } from "@/interfaces/SystemTypes";
import { registryProviderList } from "@/interfaces/SystemTypes";

import { connectRegistry } from "./connect-registry";

export const addContainerRegistry = async (
	data: ContainerRegistryDto,
	options: {
		/**
		 * Owner's user ID
		 */
		ownerId: string;
		/**
		 * Workspace ID
		 */
		workspaceId: string;
		/**
		 * Workspace's slug
		 */
		workspace?: string;
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

	// Input organization or confirm to use default:
	const { organization } = await inquirer.prompt<{ organization: string }>({
		name: "organization",
		type: "input",
		message: "Organization:",
		default: data.organization,
	});
	data.organization = organization;

	switch (data.provider) {
		case "gcloud":
			if (!data.host) {
				const { value } = await inquirer.prompt<{ value: string }>({
					name: "value",
					type: "editor",
					message: "Registry host:",
					default: "gcr.io",
				});
				data.host = value;
			}
			if (!data.imageBaseURL) data.imageBaseURL = `${data.host}/${data.organization}`;

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
			if (!data.imageBaseURL) data.imageBaseURL = `${data.host}/${data.organization}`;
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
			if (!data.imageBaseURL) data.imageBaseURL = `${data.host}/${data.organization}`;

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

	const { DB } = await import("@/modules/api/DB");
	const registry = await DB.create("registry", data);

	if (registry) {
		await connectRegistry(registry, { userId: options.ownerId, workspaceId: options.workspaceId });
	} else {
		logWarn(`Added container registry "${data.name}" but failed to connect.`);
	}

	return registry;
};
