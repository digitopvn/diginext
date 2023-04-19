import express from "express";

import BuildController from "@/controllers/BuildController";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { processApiRequest } from "@/middlewares/process-api-request";
import { registerController } from "@/middlewares/register-controller";

const router = express.Router();

const controller = new BuildController();

// TODO: add view build logs

router
	.use(authenticate, authorize)
	.use(registerController(controller))
	.get("/", processApiRequest(controller.read.bind(controller)))
	.get("/logs", processApiRequest(controller.getLogs.bind(controller)))
	.post("/", processApiRequest(controller.create.bind(controller)))
	.patch("/", processApiRequest(controller.update.bind(controller)))
	.delete("/", processApiRequest(controller.delete.bind(controller)))
	.delete("/empty", processApiRequest(controller.empty.bind(controller)))
	.post("/start", processApiRequest(controller.startBuild.bind(controller)))
	.patch("/stop", processApiRequest(controller.stopBuild.bind(controller)))
	.get("/status", processApiRequest(controller.getStatus.bind(controller)));

export default router;
