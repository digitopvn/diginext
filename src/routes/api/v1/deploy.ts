import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import express from "express";

import DeployController from "@/controllers/DeployController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

dayjs.extend(localizedFormat);

const controller = new DeployController();
const router = express.Router();

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	/**
	 * Deploy from a source code (git repository)
	 */
	.post("/", processApiRequest(controller.deployFromSource.bind(controller)))
	/**
	 * Build container image first, then deploy that build to target deploy environment.
	 * - `Alias of "/api/v1/deploy/build-first"`
	 */
	.post("/from-source", processApiRequest(controller.buildFromSourceAndDeploy.bind(controller)))
	/**
	 * Build container image first, then deploy that build to target deploy environment.
	 * - `Alias of "/api/v1/deploy/from-source"`
	 */
	.post("/build-first", processApiRequest(controller.buildAndDeploy.bind(controller)))
	/**
	 * Deploy from a build instance.
	 */
	.post("/from-build", processApiRequest(controller.deployFromBuild.bind(controller)))
	/**
	 * Build & deploy from an app.
	 */
	.post("/from-app", processApiRequest(controller.buildFromAppAndDeploy.bind(controller)))
	/**
	 * Build & deploy from a git repo.
	 */
	.post("/from-git", processApiRequest(controller.buildFromGitRepoAndDeploy.bind(controller)));
/**
 * Deploy from an image URL
 */
// .post(
// 	"/from-image",
// 	authenticate,
// 	// authorization,
// 	processApiRequest(controller.deployFromImage.bind(controller))
// );

export default router;
