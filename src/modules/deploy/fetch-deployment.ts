import { logError } from "diginext-utils/dist/xconsole/log";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

import type { KubeDeployment } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { InputOptions } from "@/interfaces/InputOptions";

export type FetchDeploymentResult = {
	domains: string[];
	endpoint: string;
	deployContent: string;
	deployYaml: string;
	NAMESPACE: string;
	SERVICE_NAME: string;
	INGRESS_NAME: string;
	IMAGE_NAME: string;
	ENV_VARS: KubeEnvironmentVariable[];
	APP_NAME: string;
	REPLICAS: number;
	PORT: number;
	BUILD_TAG: string;
};

export const fetchDeploymentFromContent = (content: string): FetchDeploymentResult => {
	let domains: string[] = [];
	let deployContent = content;
	let deploymentData = yaml.loadAll(deployContent);
	// console.log("deploymentData :>> ", deploymentData);

	let IMAGE_NAME = "",
		BUILD_TAG = "",
		APP_NAME = "",
		REPLICAS = 1,
		ENV_VARS: KubeEnvironmentVariable[] = [],
		NAMESPACE = "",
		SERVICE_NAME = "",
		INGRESS_NAME = "",
		PORT: number;

	// End point of the application:
	let endpoint = "";
	deploymentData.map((doc) => {
		if (doc && doc.kind == "Namespace") NAMESPACE = doc.metadata.name;
		if (doc && doc.kind == "Service") SERVICE_NAME = doc.metadata.name;
		if (doc && doc.kind == "Ingress") {
			INGRESS_NAME = doc.metadata.name;

			const protocol = typeof doc.spec.tls != "undefined" ? "https" : "http";
			endpoint += protocol + "://" + doc.spec.rules[0].host + doc.spec.rules[0].http.paths[0].path;

			doc.spec.rules.map((rule) => domains.push(rule.host));
		}
		if (doc && doc.kind == "Deployment") {
			const deploy = doc as KubeDeployment;
			PORT = deploy.spec.template.spec.containers[0].ports[0].containerPort;
			IMAGE_NAME = doc.spec.template.spec.containers[0].image;
			BUILD_TAG = IMAGE_NAME.split(":")[1];
			APP_NAME = doc.metadata.name;
			NAMESPACE = doc.metadata.namespace;
			REPLICAS = doc.spec.replicas;
			ENV_VARS = doc.spec.template.spec.containers[0].env;
		}
	});

	// get build number:
	BUILD_TAG = IMAGE_NAME.split(":")[1];
	// console.log("BUILD_NUMBER :>> ", BUILD_NUMBER);

	return {
		domains,
		endpoint,
		deployContent,
		deployYaml: deploymentData,
		NAMESPACE,
		SERVICE_NAME,
		INGRESS_NAME,
		IMAGE_NAME,
		ENV_VARS,
		APP_NAME,
		REPLICAS,
		PORT,
		BUILD_TAG,
	};
};

/**
 * @param  {InputOptions} options
 */

export function fetchDeployment(filePath: string, options: InputOptions = { env: "dev" }) {
	const appDirectory = options.targetDirectory;
	const { env } = options;

	// current deployment file:
	const deployFile = `deployment/deployment.${env}.yaml`;
	const DEPLOYMENT_FILE = filePath ? filePath : path.resolve(appDirectory, deployFile);

	if (!fs.existsSync(DEPLOYMENT_FILE)) {
		const msg = `Không tìm thấy "${deployFile}", chạy "diginext deploy generate --env=${env}" để khởi tạo.`;
		logError(msg);
		throw new Error(msg);
	}

	let deployContent = fs.readFileSync(DEPLOYMENT_FILE, "utf8");

	// Thay thế IMAGE_NAME vào deployment YAML:
	return fetchDeploymentFromContent(deployContent);
}
