import express from "express";

import AppController from "@/controllers/AppController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

const router = express.Router();

const controller = new AppController();

router
	.use(authenticate, authorize)
	.use(controller.parsePagination.bind(controller))
	.use(controller.parseFilter.bind(controller))
	.use(controller.parseBody.bind(controller))
	.get("/", controller.apiRespond(controller.read.bind(controller)).bind(controller))
	.get("/config", controller.apiRespond(controller.getAppConfig.bind(controller)).bind(controller))
	.post("/", controller.apiRespond(controller.create.bind(controller)).bind(controller))
	.patch("/", controller.apiRespond(controller.update.bind(controller)).bind(controller))
	.delete("/", controller.apiRespond(controller.delete.bind(controller)).bind(controller))
	.delete("/empty", controller.apiRespond(controller.empty.bind(controller)).bind(controller))
	.get("/environment", controller.apiRespond(controller.getDeployEnvironment.bind(controller)).bind(controller))
	.post("/environment", controller.apiRespond(controller.createDeployEnvironment.bind(controller)).bind(controller))
	.delete("/environment", controller.apiRespond(controller.deleteDeployEnvironment.bind(controller)).bind(controller))
	.get("/environment/variables", controller.apiRespond(controller.getEnvVarsOnDeployEnvironment.bind(controller)).bind(controller))
	.post("/environment/variables", controller.apiRespond(controller.createEnvVarsOnDeployEnvironment.bind(controller)).bind(controller))
	.patch("/environment/variables", controller.apiRespond(controller.updateSingleEnvVarOnDeployEnvironment.bind(controller)).bind(controller))
	.delete("/environment/variables", controller.apiRespond(controller.deleteEnvVarsOnDeployEnvironment.bind(controller)).bind(controller));

export default router;
