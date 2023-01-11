import { logWarn } from "diginext-utils/dist/console/log";

import type { InputOptions } from "@/interfaces/InputOptions";

/**
 * @param  {InputOptions} options
 */
export function generatePipeline(options: InputOptions) {
	logWarn(`[Deprecated] Deploy bằng Bitbucket Pipelines sẽ bị loại bỏ trong tương lai.`);
	return options;

	// const projectDirectory = (typeof options != "undefined" && options.targetDirectory) || process.cwd();
	// const diginextConfig = getAppConfig(projectDirectory);
	// const framework = getCurrentFramework(options);

	// let mainPipeline = {
	// 	image: "atlassian/default-image:2",
	// 	pipelines: {
	// 		branches: {},
	// 	},
	// 	definitions: {
	// 		services: {
	// 			docker: {
	// 				memory: 3072,
	// 			},
	// 		},
	// 	},
	// };

	// if (diginextConfig.pipeline && Object.keys(diginextConfig.pipeline).length > 0) {
	// 	for (let branch in diginextConfig.pipeline) {
	// 		var val = diginextConfig.pipeline[branch];
	// 		var clusterInfo =
	// 			val == true
	// 				? {
	// 						"project-id": "${GCLOUD_PROJECT_ID}",
	// 						cluster: "${GCLOUD_K8S_CLUSTER}",
	// 						zone: "${GCLOUD_ZONE}",
	// 						"service-account": "${GCLOUD_API_KEYFILE}",
	// 				  }
	// 				: val;

	// 		let serviceAccount = diginextConfig.pipeline[branch]["service-account"] || "$GCLOUD_API_KEYFILE";

	// 		// Build steps

	// 		let buildSteps = [
	// 			// `# GKE cluster information`,
	// 			`GKE_PROJECT_ID=${clusterInfo["project-id"] || "${GCLOUD_PROJECT_ID}"}`,
	// 			`GKE_CLUSTER_NAME=${clusterInfo.cluster || "${GCLOUD_K8S_CLUSTER}"}`,
	// 			`GKE_CLOUD_ZONE=${clusterInfo.zone || "${GCLOUD_ZONE}"}`,
	// 			// `# Configure container image & service`,
	// 			`DEPLOYMENT_FILE=deployment/deployment.${branch}.yaml`,
	// 			"APP_NAME=${BITBUCKET_REPO_SLUG}-${BITBUCKET_BRANCH}",
	// 			"IMAGE_NAME=${GCLOUD_DOCKER_GCR_URL}/${GKE_PROJECT_ID}/${APP_NAME}:${BITBUCKET_BUILD_NUMBER}",
	// 			`SERVICE_ACCOUNT=${serviceAccount}`,
	// 			// `# GCLOUD Credentials Authentication`,
	// 			`echo $SERVICE_ACCOUNT > gcloud-api-key.json`,
	// 			`gcloud auth activate-service-account --key-file gcloud-api-key.json`,
	// 			`gcloud container clusters get-credentials $GKE_CLUSTER_NAME --zone=$GKE_CLOUD_ZONE --project=$GKE_PROJECT_ID`,
	// 			`docker login -u _json_key --password-stdin https://$GCLOUD_DOCKER_GCR_URL < gcloud-api-key.json`,
	// 			// `# Build Docker Image & push to ASIA.GCR.IO repository`,
	// 			`docker build -t $IMAGE_NAME -f deployment/Dockerfile.${branch} .`,
	// 			// "# Add health check",
	// 			// `curl -X POST "https://api.health-check.digitop.vn/api/v1/jobs/links" -H  "Content-Type:application/json" -d "{\\"name\\":\\"${projectSlug}\\",\\"link\\":\\"https://${prodDomains[0]}\\"}"`,
	// 			`docker push $IMAGE_NAME`,
	// 			// `# Start deploying`,
	// 			`sed -i "s|{{image_name}}|$IMAGE_NAME|g" $DEPLOYMENT_FILE`,
	// 			`echo "$(<$DEPLOYMENT_FILE)"`,
	// 			`kubectl apply -f $DEPLOYMENT_FILE`,
	// 		];

	// 		mainPipeline.pipelines.branches[branch] = [
	// 			{
	// 				step: {
	// 					name: `Deploy to GKE ${branch.toUpperCase()} EVIRONMENT`,
	// 					image: "google/cloud-sdk:latest",
	// 					services: ["docker"],
	// 					caches: ["docker"],
	// 					script: buildSteps,
	// 				},
	// 			},
	// 		];
	// 	}
	// } else {
	// 	// logWarn(`Không có branch nào đang cần cấu hình pipeline, kích hoạt tại "dx.json" > pipeline`);
	// 	// process.exit(1);
	// }

	// let pipelineContent = yaml.dumb(mainPipeline, {
	// 	lineWidth: 280,
	// 	skipInvalid: true,
	// });
	// fs.writeFileSync(path.resolve(projectDirectory, "bitbucket-pipelines.yaml"), pipelineContent, "utf8");
}

/**
 * @param  {String[]} commands
 * @param  {InputOptions} options
 */
export async function startPipeline(commands: string[], options: InputOptions) {
	logWarn(`Deprecated.`);
	return true;
}
