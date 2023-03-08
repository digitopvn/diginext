import express from "express";

import AppController from "@/controllers/AppController";
import { authenticate } from "@/middlewares/authenticate";

const router = express.Router();

const controller = new AppController();

router
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.read.bind(controller)).bind(controller)
	)
	.get(
		"/config",
		authenticate,
		// authorize,
		controller.apiRespond(controller.getAppConfig.bind(controller)).bind(controller)
	)
	.post(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.create.bind(controller)).bind(controller)
	)
	.patch(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.update.bind(controller)).bind(controller)
	)
	.delete(
		"/",
		authenticate,
		// authorize,
		controller.apiRespond(controller.delete.bind(controller)).bind(controller)
	)
	.delete(
		"/empty",
		authenticate,
		// authorize,
		controller.apiRespond(controller.empty.bind(controller)).bind(controller)
	)
	.get(
		"/environment",
		authenticate,
		// authorize,
		controller.apiRespond(controller.getDeployEnvironment.bind(controller)).bind(controller)
	)
	.post(
		"/environment",
		authenticate,
		// authorize,
		controller.apiRespond(controller.createDeployEnvironment.bind(controller)).bind(controller)
	)
	.delete(
		"/environment",
		authenticate,
		// authorize,
		controller.apiRespond(controller.deleteDeployEnvironment.bind(controller)).bind(controller)
	)
	.get(
		"/environment/variables",
		authenticate,
		// authorize,
		controller.apiRespond(controller.getEnvVarsOnDeployEnvironment.bind(controller)).bind(controller)
	)
	.post(
		"/environment/variables",
		authenticate,
		// authorize,
		controller.apiRespond(controller.createEnvVarsOnDeployEnvironment.bind(controller)).bind(controller)
	)
	.patch(
		"/environment/variables",
		authenticate,
		// authorize,
		controller.apiRespond(controller.updateSingleEnvVarOnDeployEnvironment.bind(controller)).bind(controller)
	)
	.delete(
		"/environment/variables",
		authenticate,
		// authorize,
		controller.apiRespond(controller.deleteEnvVarsOnDeployEnvironment.bind(controller)).bind(controller)
	);

export default router;
