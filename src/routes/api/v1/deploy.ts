import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import express from "express";

import DeployController from "@/controllers/DeployController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

dayjs.extend(localizedFormat);

const controller = new DeployController();
const router = express.Router();

router
	.use(authenticate, authorize)
	/**
	 * Deploy from a source code (git repository)
	 */
	.post("/", controller.apiRespond(controller.deployFromSource.bind(controller)).bind(controller))
	/**
	 * Build container image first, then deploy that build to target deploy environment.
	 * - `Alias of "/api/v1/deploy/build-first"`
	 */
	.post("/from-source", controller.apiRespond(controller.buildFromSourceAndDeploy.bind(controller)).bind(controller))
	/**
	 * Build container image first, then deploy that build to target deploy environment.
	 * - `Alias of "/api/v1/deploy/from-source"`
	 */
	.post("/build-first", controller.apiRespond(controller.buildAndDeploy.bind(controller)).bind(controller))
	/**
	 * Deploy from a build instance.
	 */
	.post("/from-build", controller.apiRespond(controller.deployFromBuild.bind(controller)).bind(controller));
/**
 * Deploy from an image URL
 */
// .post(
// 	"/from-image",
// 	authenticate,
// 	// authorization,
// 	controller.apiRespond(controller.deployFromImage.bind(controller)).bind(controller)
// );

export default router;
