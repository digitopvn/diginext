import { logError } from "diginext-utils/dist/console/log";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

import type { InputOptions } from "@/interfaces/InputOptions";

export const fetchDeploymentFromContent = (content: string) => {
	let domains = [];
	let deployContent = content;
	let deploymentData = yaml.loadAll(deployContent);
	// console.log("deploymentData :>> ", deploymentData);

	let IMAGE_NAME = "",
		BUILD_NUMBER = "",
		APP_NAME = "",
		REPLICAS = 1,
		APP_ENV = [],
		NAMESPACE = "",
		SERVICE_NAME = "",
		INGRESS_NAME = "";

	// End point của ứng dụng:
	let endpoint = "";
	deploymentData.map((doc) => {
		if (doc && doc.kind == "Namespace") NAMESPACE = doc.metadata.name;
		if (doc && doc.kind == "Service") SERVICE_NAME = doc.metadata.name;
		if (doc && doc.kind == "Ingress") {
			INGRESS_NAME = doc.metadata.name;

			const protocol = typeof doc.spec.tls != "undefined" ? "http" : "https";
			endpoint += protocol + "://" + doc.spec.rules[0].host + doc.spec.rules[0].http.paths[0].path;

			doc.spec.rules.map((rule) => domains.push(rule.host));
		}
		if (doc && doc.kind == "Deployment") {
			IMAGE_NAME = doc.spec.template.spec.containers[0].image;
			BUILD_NUMBER = IMAGE_NAME.split(":")[1];
			APP_NAME = doc.metadata.name;
			NAMESPACE = doc.metadata.namespace;
			REPLICAS = doc.spec.replicas;
			APP_ENV = doc.spec.template.spec.containers[0].env;
		}
	});

	// get build number:
	BUILD_NUMBER = IMAGE_NAME.split(":")[1];
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
		APP_ENV,
		APP_NAME,
		REPLICAS,
		BUILD_NUMBER,
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

	if (!fs.existsSync(DEPLOYMENT_FILE)) logError(`Không tìm thấy "${deployFile}", chạy "diginext deploy generate --env=${env}" để khởi tạo.`);

	let deployContent = fs.readFileSync(DEPLOYMENT_FILE, "utf8");

	// Thay thế IMAGE_NAME vào deployment YAML:
	return fetchDeploymentFromContent(deployContent);
}
